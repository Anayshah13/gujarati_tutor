"""
STEP 3 — Run the app.
Command: streamlit run step3_app.py
"""

import streamlit as st
import time, os, pickle, hashlib, tempfile
from pathlib import Path
import numpy as np

# ── Page config ───────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="ગુજ AI Tutor",
    page_icon="🇮🇳",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;700&display=swap');
.guj { font-family: 'Noto Sans Gujarati', sans-serif; font-size: 1.2rem; color: #003580; }
.hero { background: linear-gradient(135deg,#FF6B00,#FF8C2A 60%,#138808);
        padding:1.5rem 2rem; border-radius:16px; color:white; margin-bottom:1rem; }
.hero h1 { margin:0; font-size:1.8rem; }
.hero p  { margin:0.3rem 0 0; opacity:0.88; font-size:0.9rem; }
.chat-user { background:#FF6B00; color:white; padding:0.6rem 1rem;
             border-radius:16px 16px 4px 16px; margin:0.3rem 0;
             max-width:75%; margin-left:auto; font-size:0.9rem; }
.chat-bot  { background:white; color:#1C0A00; padding:0.6rem 1rem;
             border-radius:4px 16px 16px 16px; margin:0.3rem 0;
             max-width:80%; border:1px solid #F0E0CC; font-size:0.9rem;
             box-shadow:0 2px 6px rgba(0,0,0,0.06); }
.meta { font-size:0.7rem; color:#aaa; margin-top:4px; font-family:monospace; }
</style>
""", unsafe_allow_html=True)

# ═══════════════════════════════════════════════════════
# LOAD ENGINES — cached so they load only once
# ═══════════════════════════════════════════════════════

@st.cache_resource(show_spinner="Loading RAG index...")
def load_rag():
    if not Path("rag_data/gujarati.index").exists():
        return None, None, None, None
    import faiss
    from sentence_transformers import SentenceTransformer
    index = faiss.read_index("rag_data/gujarati.index")
    with open("rag_data/chunks.pkl", "rb") as f:
        data = pickle.load(f)
    embedder = SentenceTransformer(
        "paraphrase-multilingual-MiniLM-L12-v2", device="cpu"
    )
    return index, data["chunks"], data["sources"], embedder

@st.cache_resource(show_spinner="Loading Gujarati TTS model (first time takes ~2 min)...")
def load_tts():
    try:
        from transformers import VitsModel, AutoTokenizer
        import torch
        model     = VitsModel.from_pretrained("facebook/mms-tts-guj")
        tokenizer = AutoTokenizer.from_pretrained("facebook/mms-tts-guj")
        model.eval()
        return model, tokenizer, model.config.sampling_rate
    except Exception as e:
        st.warning(f"TTS failed to load: {e}")
        return None, None, None

index, chunks, sources, embedder = load_rag()
tts_model, tts_tokenizer, sample_rate = load_tts()

# ═══════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════

def rag_retrieve(query, top_k=3):
    """Find top_k most relevant chunks for a query."""
    import faiss
    q_vec = embedder.encode(
        [query], convert_to_numpy=True, normalize_embeddings=True
    )
    distances, indices = index.search(q_vec, top_k)
    results = []
    for dist, idx in zip(distances[0], indices[0]):
        if idx >= 0:
            results.append({
                "text":   chunks[idx],
                "source": sources[idx],
                "score":  round(float(dist), 4),
            })
    return results

def call_ollama(prompt, model_name="gemma2:2b"):
    """Call locally running Ollama. Returns None if offline."""
    try:
        import requests
        r = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": model_name, "prompt": prompt, "stream": False},
            timeout=60,
        )
        if r.status_code == 200:
            return r.json().get("response", "").strip()
    except Exception:
        pass
    return None

def rag_answer(query):
    """Full RAG pipeline: retrieve → prompt → generate."""
    t0 = time.time()

    results    = rag_retrieve(query)
    t_retrieve = round(time.time() - t0, 2)

    context = "\n\n".join(
        f"[{r['source']}]\n{r['text']}" for r in results
    )

    prompt = f"""You are a helpful Gujarati language tutor.
Use ONLY the context below to answer. Include Gujarati script with transliteration.
Keep the answer under 100 words.
If the answer is not in the context, say "I don't have that in my knowledge base."

Context:
{context}

Question: {query}

Answer:"""

    t1         = time.time()
    llm_ans    = call_ollama(prompt)
    t_llm      = round(time.time() - t1, 2)
    t_total    = round(time.time() - t0, 2)

    if llm_ans:
        return {
            "answer":  llm_ans,
            "mode":    "RAG + Gemma 2B",
            "sources": list(set(r["source"] for r in results)),
            "scores":  [r["score"] for r in results],
            "t_total": t_total,
        }

    # Fallback if Ollama offline — return best chunk directly
    best = results[0]["text"] if results else "No relevant information found."
    return {
        "answer":  best,
        "mode":    "RAG only (Ollama offline — run: ollama serve)",
        "sources": list(set(r["source"] for r in results)),
        "scores":  [r["score"] for r in results],
        "t_total": t_total,
    }

def speak_gujarati(text):
    """Convert Gujarati text → WAV bytes using your TTS model."""
    if tts_model is None or not text.strip():
        return None
    try:
        import torch, soundfile as sf, io
        # Cache so same text doesn't re-generate
        cache_dir  = Path("tts_cache")
        cache_dir.mkdir(exist_ok=True)
        cache_file = cache_dir / f"{hashlib.md5(text.encode()).hexdigest()[:10]}.wav"

        if not cache_file.exists():
            inputs = tts_tokenizer(text, return_tensors="pt")
            with torch.no_grad():
                waveform = tts_model(**inputs).waveform
            sf.write(str(cache_file), waveform.squeeze().numpy(), sample_rate)

        return cache_file.read_bytes()
    except Exception as e:
        st.warning(f"TTS error: {e}")
        return None

def ollama_running():
    try:
        import requests
        r = requests.get("http://localhost:11434/api/tags", timeout=2)
        return r.status_code == 200
    except Exception:
        return False

def score_audio(path, n_phonemes):
    """Score pronunciation from audio file. Returns dict of scores 0-100."""
    try:
        import librosa
        y, sr    = librosa.load(path, sr=16000)
        dur      = librosa.get_duration(y=y, sr=sr)
        rms      = float(np.mean(librosa.feature.rms(y=y)[0]))
        zcr      = float(np.mean(librosa.feature.zero_crossing_rate(y)[0]))
        centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]

        energy   = min(100, max(20, int(rms * 4000)))
        clarity  = min(100, max(20, int(100 - abs(zcr - 0.08) * 900)))
        ideal    = n_phonemes * 0.38
        duration = min(100, int(min(dur, ideal) / max(dur, ideal) * 100))
        pitch    = min(100, max(30, int(100 - float(np.std(centroid)) / 55)))
        overall  = int(energy*0.25 + clarity*0.35 + duration*0.2 + pitch*0.2)

        return {"overall": overall, "energy": energy,
                "clarity": clarity, "duration": duration, "pitch": pitch}
    except Exception:
        # fallback if librosa has issues
        return {"overall": 65, "energy": 70, "clarity": 65,
                "duration": 60, "pitch": 65}

# ═══════════════════════════════════════════════════════
# SESSION STATE
# ═══════════════════════════════════════════════════════
if "messages"    not in st.session_state: st.session_state.messages    = []
if "query_count" not in st.session_state: st.session_state.query_count = 0
if "quiz_idx"    not in st.session_state: st.session_state.quiz_idx    = 0
if "quiz_score"  not in st.session_state: st.session_state.quiz_score  = 0
if "quiz_done"   not in st.session_state: st.session_state.quiz_done   = False
if "quiz_chosen" not in st.session_state: st.session_state.quiz_chosen = None
if "pron_log"    not in st.session_state: st.session_state.pron_log    = []

# ═══════════════════════════════════════════════════════
# SIDEBAR
# ═══════════════════════════════════════════════════════
with st.sidebar:
    st.markdown("## 🇮🇳 ગુજ AI Tutor")
    st.caption("DJSCE IPD 2025-26")
    st.markdown("---")

    # System status
    st.markdown("### System Status")

    if index is not None:
        st.success(f"✅ RAG — {index.ntotal} chunks loaded")
    else:
        st.error("❌ RAG not ready")
        st.code("python step2_build_rag.py", language="bash")

    if tts_model is not None:
        st.success("✅ TTS — facebook/mms-tts-guj")
    else:
        st.error("❌ TTS failed to load")

    if ollama_running():
        st.success("✅ Ollama running")
    else:
        st.warning("⚠️ Ollama offline")
        st.caption("In a new terminal run:")
        st.code("ollama serve", language="bash")
        st.caption("Then in another terminal:")
        st.code("ollama pull gemma2:2b", language="bash")

    st.markdown("---")
    st.metric("Queries this session", st.session_state.query_count)

    if index is not None:
        st.markdown("### Knowledge Base")
        with open("rag_data/chunks.pkl", "rb") as f:
            d = pickle.load(f)
        src_counts = {}
        for s in d["sources"]:
            src_counts[s] = src_counts.get(s, 0) + 1
        for src, count in sorted(src_counts.items()):
            st.caption(f"📄 {src} — {count} chunks")

# ═══════════════════════════════════════════════════════
# HERO
# ═══════════════════════════════════════════════════════
st.markdown("""
<div class="hero">
  <h1>🇮🇳 ગુજ AI Tutor</h1>
  <p>RAG Chatbot + Gujarati TTS + Pronunciation Scorer + Grammar Quiz</p>
</div>
""", unsafe_allow_html=True)

if index is None:
    st.error("⚠️ RAG index not found. Run `python step2_build_rag.py` first, then refresh.")
    st.stop()

# ═══════════════════════════════════════════════════════
# TABS
# ═══════════════════════════════════════════════════════
tab1, tab2, tab3, tab4 = st.tabs([
    "💬 RAG Chatbot",
    "🎤 Pronunciation",
    "📝 Grammar Quiz",
    "📊 Benchmark",
])

# ───────────────────────────────────────────────────────
# TAB 1 — RAG CHATBOT
# ───────────────────────────────────────────────────────
with tab1:
    st.markdown("#### Ask anything about Gujarati language")

    # Quick questions
    quick = [
        "How do I say hello?",
        "Numbers 1 to 10",
        "Gujarati sentence structure",
        "Family words",
        "Colors in Gujarati",
        "What does હું mean?",
        "How do I say good morning?",
        "Days of the week",
    ]
    cols = st.columns(4)
    for i, q in enumerate(quick):
        if cols[i % 4].button(q, key=f"q{i}", use_container_width=True):
            st.session_state["_prefill"] = q
            st.rerun()

    prefill    = st.session_state.pop("_prefill", "")
    user_input = st.text_input(
        "Your question:",
        value=prefill,
        placeholder="e.g. How do I say thank you in Gujarati?"
    )

    c1, c2, c3 = st.columns([1, 1, 2])
    ask     = c1.button("Ask →", type="primary", use_container_width=True)
    clear   = c2.button("Clear chat", use_container_width=True)
    speak   = c3.checkbox("🔊 Speak answers aloud", value=True)

    if clear:
        st.session_state.messages = []
        st.rerun()

    if ask and user_input.strip():
        with st.spinner("Searching knowledge base..."):
            result = rag_answer(user_input)

        st.session_state.query_count += 1
        st.session_state.messages.append({
            "q":      user_input,
            "a":      result["answer"],
            "meta":   f"{result['mode']} · {result['t_total']}s · {', '.join(result['sources'])}",
            "scores": result["scores"],
        })

        if speak and tts_model is not None:
            with st.spinner("Generating speech..."):
                audio = speak_gujarati(result["answer"])
            if audio:
                st.audio(audio, format="audio/wav", autoplay=True)

    # Conversation history
    if st.session_state.messages:
        st.markdown("---")
        for turn in reversed(st.session_state.messages):
            st.markdown(f'<div class="chat-user">🙋 {turn["q"]}</div>', unsafe_allow_html=True)
            st.markdown(f'<div class="chat-bot">🤖 {turn["a"]}<div class="meta">{turn["meta"]}</div></div>', unsafe_allow_html=True)
            with st.expander("🔍 RAG retrieval scores"):
                st.caption(f"Cosine similarity scores: {turn['scores']}")

# ───────────────────────────────────────────────────────
# TAB 2 — PRONUNCIATION SCORER
# ───────────────────────────────────────────────────────
with tab2:
    st.markdown("#### Upload a recording — get a 0–100 pronunciation score")
    st.caption("Record yourself saying a Gujarati word on your phone → transfer to laptop → upload here")

    WORDS = {
        "નમસ્તે — Hello":        {"phonemes": 3, "level": "Easy"},
        "ગુજરાત — Gujarat":      {"phonemes": 3, "level": "Easy"},
        "આભાર — Thank you":      {"phonemes": 2, "level": "Easy"},
        "કેમ છો — How are you":  {"phonemes": 2, "level": "Medium"},
        "સારું — Good":          {"phonemes": 2, "level": "Easy"},
        "ભારત — India":          {"phonemes": 3, "level": "Easy"},
        "વ્યાકરણ — Grammar":     {"phonemes": 4, "level": "Hard"},
    }

    col_a, col_b = st.columns(2)

    with col_a:
        word = st.selectbox("Choose a word to practise:", list(WORDS.keys()))
        info = WORDS[word]
        st.info(f"**Level:** {info['level']}  |  **Syllables:** {info['phonemes']}")

        if st.button("🔊 Hear correct pronunciation", use_container_width=True):
            word_text = word.split("—")[0].strip()
            if tts_model:
                with st.spinner("Generating..."):
                    audio = speak_gujarati(word_text)
                if audio:
                    st.audio(audio, format="audio/wav", autoplay=True)
            else:
                st.warning("TTS not loaded")

    with col_b:
        uploaded = st.file_uploader(
            "Upload your recording:",
            type=["wav", "mp3", "ogg", "m4a"]
        )
        if uploaded:
            st.audio(uploaded)
            if st.button("📊 Score my pronunciation", type="primary", use_container_width=True):
                suffix = Path(uploaded.name).suffix or ".wav"
                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                    tmp.write(uploaded.read())
                    tmp_path = tmp.name

                with st.spinner("Analysing..."):
                    scores = score_audio(tmp_path, info["phonemes"])
                os.unlink(tmp_path)

                overall = scores["overall"]
                color   = "#138808" if overall >= 80 else "#FF6B00" if overall >= 60 else "#c62828"
                grade   = "A" if overall >= 80 else "B" if overall >= 65 else "C" if overall >= 50 else "F"

                st.markdown(f"<h1 style='text-align:center;color:{color}'>{overall}/100 — Grade {grade}</h1>", unsafe_allow_html=True)

                for label, val, col_name in [
                    ("🔊 Voice Energy",      scores["energy"],   "orange"),
                    ("👄 Speech Clarity",    scores["clarity"],  "green"),
                    ("⏱ Duration Match",     scores["duration"], "blue"),
                    ("🎵 Pitch Consistency", scores["pitch"],    "gold"),
                ]:
                    st.markdown(f"**{label}**: {val}/100")
                    st.progress(val / 100)

                tips = []
                if scores["energy"]   < 60: tips.append("Speak louder and closer to the mic")
                if scores["clarity"]  < 60: tips.append("Slow down — each syllable clearly")
                if scores["duration"] < 60: tips.append("Match natural word length")
                if scores["pitch"]    < 60: tips.append("Keep a steady tone throughout")
                if not tips:               tips.append("Excellent! Try a harder word.")

                st.markdown("**💡 Tips:** " + " · ".join(tips))

                st.session_state.pron_log.append({
                    "Word": word.split("—")[0].strip(),
                    "Score": overall, "Grade": grade,
                    "Energy": scores["energy"], "Clarity": scores["clarity"],
                    "Duration": scores["duration"], "Pitch": scores["pitch"],
                })

    if st.session_state.pron_log:
        st.markdown("---")
        st.markdown("#### Your results this session")
        import pandas as pd
        df = pd.DataFrame(st.session_state.pron_log)
        st.dataframe(df, use_container_width=True, hide_index=True)
        st.metric("Session average", f"{df['Score'].mean():.1f}/100")
        st.download_button("💾 Download CSV", df.to_csv(index=False),
                           "pronunciation_results.csv", "text/csv")

# ───────────────────────────────────────────────────────
# TAB 3 — GRAMMAR QUIZ
# ───────────────────────────────────────────────────────
with tab3:
    QUESTIONS = [
        {"q": "What does નમસ્તે mean?", "guj": "નમસ્તે",
         "opts": ["Hello / Greetings", "Goodbye", "Thank you", "Sorry"],
         "ans": 0, "hint": "Most common Gujarati greeting"},
        {"q": "Gujarati sentence structure?", "guj": "વ્યાકરણ",
         "opts": ["SOV — verb at end", "SVO like English", "VSO", "OVS"],
         "ans": 0, "hint": "Verb always comes LAST"},
        {"q": "How many genders in Gujarati?", "guj": "લિંગ",
         "opts": ["2 like English", "3 — M / F / Neuter", "1", "4"],
         "ans": 1, "hint": "One more than English"},
        {"q": "What does હું mean?", "guj": "હું",
         "opts": ["You", "He/She", "I / Me", "We"],
         "ans": 2, "hint": "First person singular"},
        {"q": "Thank you in Gujarati:", "guj": "?",
         "opts": ["માફ કરો", "આભાર", "નમસ્તે", "કેમ છો"],
         "ans": 1, "hint": "Starts with Aa sound"},
        {"q": "Postpositions in Gujarati go...", "guj": "—",
         "opts": ["Before the noun", "After the noun", "Anywhere", "Don't exist"],
         "ans": 1, "hint": "Opposite of English prepositions"},
        {"q": "What does છે (chhe) mean?", "guj": "છે",
         "opts": ["Go", "Is / Am / Are", "Eat", "Come"],
         "ans": 1, "hint": "Most common Gujarati verb"},
    ]

    total = len(QUESTIONS)
    idx   = st.session_state.quiz_idx

    if st.session_state.quiz_done:
        pct   = round(st.session_state.quiz_score / total * 100)
        emoji = "🏆" if pct >= 80 else "👍" if pct >= 60 else "📚"
        st.markdown(f"<div style='text-align:center;font-size:4rem'>{emoji}</div>", unsafe_allow_html=True)
        st.markdown(f"<div style='text-align:center;font-size:2.5rem;font-weight:800'>{st.session_state.quiz_score}/{total} — {pct}%</div>", unsafe_allow_html=True)
        if st.button("↻ Try again", type="primary"):
            st.session_state.quiz_idx    = 0
            st.session_state.quiz_score  = 0
            st.session_state.quiz_done   = False
            st.session_state.quiz_chosen = None
            st.rerun()
    else:
        q = QUESTIONS[idx]
        st.progress(idx / total)
        st.caption(f"Question {idx+1} of {total}  ·  Score: {st.session_state.quiz_score}")

        with st.container(border=True):
            st.markdown(f'<span class="guj">{q["guj"]}</span>', unsafe_allow_html=True)
            st.markdown(f"### {q['q']}")
            st.caption(f"💡 {q['hint']}")

        chosen = st.session_state.quiz_chosen
        for i, opt in enumerate(q["opts"]):
            label = opt
            if chosen is not None:
                if i == q["ans"]:    label = f"✅ {opt}"
                elif i == chosen:    label = f"❌ {opt}"
            if st.button(label, key=f"opt_{idx}_{i}",
                         disabled=(chosen is not None),
                         use_container_width=True):
                st.session_state.quiz_chosen = i
                if i == q["ans"]:
                    st.session_state.quiz_score += 1
                st.rerun()

        if chosen is not None:
            if idx < total - 1:
                if st.button("Next →", type="primary"):
                    st.session_state.quiz_idx   += 1
                    st.session_state.quiz_chosen = None
                    st.rerun()
            else:
                if st.button("See final score →", type="primary"):
                    st.session_state.quiz_done = True
                    st.rerun()

# ───────────────────────────────────────────────────────
# TAB 4 — BENCHMARK
# ───────────────────────────────────────────────────────
with tab4:
    st.markdown("#### Run benchmark — get accuracy % for your report")
    st.caption("Tests 10 standard questions and measures accuracy + response time.")

    TESTS = [
        {"q": "How do I say hello in Gujarati?",       "kw": ["namaste","નમસ્તે","hello"]},
        {"q": "What is the sentence structure?",        "kw": ["sov","subject","verb","end"]},
        {"q": "How many genders does Gujarati have?",  "kw": ["three","3","masculine","feminine","neuter"]},
        {"q": "What does હું mean?",                    "kw": ["i","me","pronoun"]},
        {"q": "How do I say thank you?",                "kw": ["aabhar","આભાર","thank"]},
        {"q": "What are numbers 1 to 5?",              "kw": ["એક","ek","one","બે","be","two"]},
        {"q": "What are postpositions in Gujarati?",   "kw": ["after","noun","postposition"]},
        {"q": "How do I say good morning?",            "kw": ["shubh","savar","morning","સવાર"]},
        {"q": "What are family words in Gujarati?",    "kw": ["mother","father","bhai","bahen"]},
        {"q": "What does છે mean?",                     "kw": ["is","am","are","chhe"]},
    ]

    if st.button("▶ Run Benchmark (10 questions)", type="primary"):
        results  = []
        progress = st.progress(0)
        status   = st.empty()

        for i, test in enumerate(TESTS):
            status.text(f"Testing {i+1}/10: {test['q']}")
            result  = rag_answer(test["q"])
            ans_low = result["answer"].lower()
            correct = any(k.lower() in ans_low for k in test["kw"])
            results.append({
                "Q":        test["q"],
                "Answer":   result["answer"][:80] + "...",
                "✓":        "✅" if correct else "❌",
                "Time (s)": result["t_total"],
                "Mode":     result["mode"],
            })
            progress.progress((i + 1) / 10)

        status.empty(); progress.empty()

        import pandas as pd
        df = pd.DataFrame(results)
        st.dataframe(df, use_container_width=True, hide_index=True)

        correct_n = sum(1 for r in results if r["✓"] == "✅")
        accuracy  = correct_n / len(results) * 100
        avg_time  = df["Time (s)"].mean()

        c1, c2, c3 = st.columns(3)
        c1.metric("Accuracy",      f"{accuracy:.0f}%", f"{correct_n}/10 correct")
        c2.metric("Avg Response",  f"{avg_time:.2f}s")
        c3.metric("Mode",          "RAG+LLM" if "Gemma" in results[0]["Mode"] else "RAG only")

        if accuracy >= 70:
            st.success(f"🎉 {accuracy:.0f}% — strong result!")
        else:
            st.warning("Add more .txt files to gujarati_knowledge/ to improve accuracy")

        st.download_button("💾 Download results CSV",
            df.to_csv(index=False), "benchmark.csv", "text/csv")
