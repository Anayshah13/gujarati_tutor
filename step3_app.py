"""
STEP 3 — Run the app.
Command: streamlit run step3_app.py
"""

import streamlit as st
import time, os, pickle, hashlib, tempfile
from pathlib import Path
import numpy as np
from datetime import datetime

try:
    import imageio_ffmpeg
    os.environ["PATH"] += os.pathsep + os.path.dirname(imageio_ffmpeg.get_ffmpeg_exe())
except ImportError:
    pass

# ── Page config ───────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="ગુજ AI Tutor",
    page_icon="🇮🇳",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Gujarati:wght@400;700&display=swap');

/* ========================================= */
/* GLOBAL DARK THEME FIXES /*
/* ========================================= */
.stApp, .stApp > header { background-color: #0D1117 !important; }

/* Sidebar styling */
section[data-testid="stSidebar"] {
    background-color: #0D1117 !important;
    width: 280px !important;
    min-width: 280px !important;
    max-width: 280px !important;
    border-right: 1px solid #21262D !important;
}
[data-testid="stSidebarCollapseButton"] { color: #E6EDF3 !important; }

/* Hide Streamlit default UI elements */
#MainMenu {visibility: hidden;}
footer {visibility: hidden;}

/* Base typography */
html, body, [class*="css"], .stMarkdown {
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #E6EDF3;
}

.guj { 
    font-family: 'Noto Sans Gujarati', sans-serif; 
    font-size: 1.4rem; 
    color: #FF9933; 
    font-weight: 600;
}

/* Premium Hero Section */
.hero { 
    background: linear-gradient(135deg, #FF9933 0%, #FFFFFF 50%, #138808 100%);
    padding: 3rem 2rem; 
    border-radius: 20px; 
    margin-bottom: 2.5rem;
    box-shadow: 0 10px 30px rgba(0,0,0,0.08);
    text-align: center;
    border: 1px solid rgba(255,255,255,0.4);
    position: relative;
    overflow: hidden;
}
.hero::before {
    content: '';
    position: absolute;
    top: -50%; left: -50%; width: 200%; height: 200%;
    background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 60%);
    animation: rotate 20s linear infinite;
}
@keyframes rotate { 100% { transform: rotate(360deg); } }

.hero-content {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    padding: 2.5rem;
    border-radius: 16px;
    display: inline-block;
    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    position: relative;
    z-index: 2;
}
.hero-content h1 { 
    margin: 0;
    font-size: 3.2rem; 
    font-weight: 800;
    color: #1a1a1a;
    letter-spacing: -0.5px;
    line-height: 1.2;
}
.hero-content p { 
    margin: 0.8rem 0 0; 
    color: #4a4a4a; 
    font-size: 1.15rem;
    font-weight: 500;
}

/* ========================================= */
/* 2. CHAT BUBBLES */
/* ========================================= */
.chat-row-user {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 1.5rem;
}
.chat-bubble-user-wrap {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    max-width: 80%;
}
.chat-bubble-user {
    background: #FF9933;
    color: #1a1a1a;
    padding: 0.8rem 1.2rem;
    border-radius: 18px 18px 4px 18px;
    font-size: 0.95rem;
    font-weight: 500;
    line-height: 1.5;
}

.chat-row-bot {
    display: flex;
    justify-content: flex-start;
    margin-bottom: 1.5rem;
    gap: 0.8rem;
}
.bot-avatar {
    width: 32px;
    height: 32px;
    background: #1F6FEB;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    flex-shrink: 0;
}
.chat-bubble-bot-wrap {
    display: flex;
    flex-direction: column;
    max-width: 80%;
}
.chat-bubble-bot {
    background: #161B22;
    border: 1px solid #21262D;
    color: #E6EDF3;
    padding: 0.8rem 1.2rem;
    border-radius: 4px 18px 18px 18px;
    font-size: 0.95rem;
    line-height: 1.6;
}
.chat-meta {
    font-family: monospace;
    color: #484F58;
    font-size: 0.72rem;
    margin-top: 0.4rem;
}

/* ========================================= */
/* 3. BUTTONS */
/* ========================================= */
/* Default Custom (Quiz/Standard Secondary buttons) */
.stButton button {
    background: #0D1117 !important;
    border: 1px solid #30363D !important;
    border-radius: 10px !important;
    color: #E6EDF3 !important;
    justify-content: flex-start !important;
    padding-left: 1rem !important;
    width: 100% !important;
    transition: all 0.2s;
}

/* Primary Button Override */
button[kind="primary"] {
    background: #161B22 !important;
    border: 1px solid #FF9933 !important;
    color: #FF9933 !important;
    border-radius: 8px !important;
    justify-content: center !important; 
    padding-left: 0 !important;
}
button[kind="primary"]:hover {
    background: #FF9933 !important;
    color: #000000 !important;
}

/* Quick Questions Columns Pill Buttons Override */
[data-testid="column"] .stButton button {
    background: transparent !important;
    border: 1px solid #30363D !important;
    border-radius: 999px !important;
    color: #8B949E !important;
    justify-content: center !important;
    padding-left: 0 !important;
    font-size: 0.82rem !important;
}
[data-testid="column"] .stButton button:hover {
    border-color: #FF9933 !important;
    color: #E6EDF3 !important;
}

/* ========================================= */
/* 4. TABS */
/* ========================================= */
div[data-testid="stTabs"] { background: transparent; }
button[data-baseweb="tab"] {
    background: transparent !important;
    border: none !important;
    border-bottom: 1px solid #21262D !important;
    color: #8B949E !important;
    padding-bottom: 10px !important;
    border-radius: 0 !important;
    font-weight: 500 !important;
}
button[data-baseweb="tab"][aria-selected="true"] {
    border-bottom: 2px solid #FF9933 !important;
    color: #FFFFFF !important;
}
div[data-baseweb="tab-list"] {
    gap: 1.5rem;
    border-bottom: 1px solid #21262D;
}
div[data-baseweb="tab-highlight"] { display: none; }
div[data-testid="stTabs"] > div[data-testid="stVerticalBlock"] > div[data-testid="stVerticalBlock"] {
    border: none !important; 
    padding: 1.5rem 0 0 0 !important;
}

/* Box Hover Effects */
.hero { transition: transform 0.3s ease, box-shadow 0.3s ease; }
.hero:hover { 
    transform: scale(1.01); 
    box-shadow: 0 15px 40px rgba(255,153,51,0.15); 
}

div[style*="border-radius: 6px"], 
div[style*="border-radius: 8px"], 
div[style*="border-radius: 12px"],
div[data-testid="stVerticalBlockBorderWrapper"] {
    transition: transform 0.2s ease, box-shadow 0.2s ease !important;
}
div[style*="border-radius: 6px"]:hover, 
div[style*="border-radius: 8px"]:hover, 
div[style*="border-radius: 12px"]:hover,
div[data-testid="stVerticalBlockBorderWrapper"]:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 12px rgba(255, 153, 51, 0.2) !important;
    z-index: 10;
}

/* Mobile optimizations */
@media (max-width: 768px) {
    .hero { padding: 1.5rem; }
    .hero h1 { font-size: 2rem; }
    section[data-testid="stSidebar"] {
        width: 100% !important;
        min-width: 100% !important;
        max-width: 100% !important;
    }
    div[data-baseweb="tab-list"] {
        flex-wrap: wrap;
        gap: 0.5rem;
    }
    .chat-bubble-user-wrap, .chat-bubble-bot-wrap {
        max-width: 95%;
    }
}
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
        return None, None, None

@st.cache_resource(show_spinner="Loading offline STT model (Whisper)...")
def load_whisper():
    try:
        import whisper
        return whisper.load_model("base")
    except Exception as e:
        return None

index, chunks, sources, embedder = load_rag()
tts_model, tts_tokenizer, sample_rate = load_tts()
whisper_model = load_whisper()

# ═══════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════

def rag_retrieve(query, top_k=3):
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
    t0 = time.time()
    results = rag_retrieve(query)
    
    context = "\n\n".join(f"[{r['source']}]\n{r['text']}" for r in results)

    # Automatically try transliteration as added context if the user inputs phonetics
    gujarati_guess = transliterate_to_gujarati(query)
    if gujarati_guess != query and not any("\u0A80" <= c <= "\u0AFF" for c in query):
        context += f"\n\n[Transliterated Query Hint]\nThe user might be asking about: {gujarati_guess}"

    prompt = f"""You are a helpful Gujarati language tutor.
Use ONLY the context below to answer. Include Gujarati script with transliteration.
Keep the answer under 100 words.
If the answer is not in the context, say "I don't have that in my knowledge base."

Context:
{context}

Question: {query}

Answer:"""

    llm_ans = call_ollama(prompt)
    t_total = round(time.time() - t0, 2)

    if llm_ans:
        return {
            "answer":  llm_ans,
            "mode":    "RAG + Gemma 2B",
            "sources": list(set(r["source"] for r in results)),
            "scores":  [r["score"] for r in results],
            "t_total": t_total,
        }

    best = results[0]["text"] if results else "No relevant information found."
    return {
        "answer":  best,
        "mode":    "RAG only (Ollama offline — run: ollama serve)",
        "sources": list(set(r["source"] for r in results) if results else []),
        "scores":  [r["score"] for r in results],
        "t_total": t_total,
    }

def speak_gujarati(text):
    if tts_model is None or not text.strip():
        return None
    try:
        import torch, soundfile as sf, io
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
        return None

def ollama_running():
    try:
        import requests
        r = requests.get("http://localhost:11434/api/tags", timeout=2)
        return r.status_code == 200
    except Exception:
        return False

def score_audio(path, n_phonemes):
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
        return {"overall": overall, "energy": energy, "clarity": clarity, "duration": duration, "pitch": pitch}
    except Exception:
        return {"overall": 65, "energy": 70, "clarity": 65, "duration": 60, "pitch": 65}


def transliterate_to_gujarati(eng_text):
    """Convert phonetic English text to Gujarati script using indic_transliteration."""
    try:
        from indic_transliteration import sanscript
        from indic_transliteration.sanscript import transliterate
        return transliterate(eng_text, sanscript.ITRANS, sanscript.GUJARATI)
    except Exception as e:
        return eng_text

# ═══════════════════════════════════════════════════════
# SESSION STATE
# ═══════════════════════════════════════════════════════
if "messages"     not in st.session_state: st.session_state.messages     = []
if "query_count"  not in st.session_state: st.session_state.query_count  = 0
if "quiz_idx"     not in st.session_state: st.session_state.quiz_idx     = 0
if "quiz_score"   not in st.session_state: st.session_state.quiz_score   = 0
if "quiz_done"    not in st.session_state: st.session_state.quiz_done    = False
if "quiz_chosen"  not in st.session_state: st.session_state.quiz_chosen  = None
if "pron_log"     not in st.session_state: st.session_state.pron_log     = []
if "trans_active" not in st.session_state: st.session_state.trans_active = False


if index is None:
    st.error("⚠️ RAG index not found. Run `python step2_build_rag.py` first, then refresh.")
    st.stop()

# ═══════════════════════════════════════════════════════
# SIDEBAR
# ═══════════════════════════════════════════════════════
with st.sidebar:
    st.markdown("## 🇮🇳 Guj-Gyani")
    st.markdown('<hr style="border: none; border-top: 2px solid #FF9933; width: 40px; margin: 0 0 1.5rem 0;">', unsafe_allow_html=True)
    
    st.markdown("<div style='color: #8B949E; font-size: 0.85rem; margin-bottom: 0.8rem; font-weight: 600; text-transform: uppercase;'>System Status</div>", unsafe_allow_html=True)

    # RAG Status Card
    if index is not None:
        st.markdown(f"""
        <div style="background: #161B22; border-left: 3px solid #3FB950; padding: 0.8rem; border-radius: 6px; margin-bottom: 0.8rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem;">
            <span>✅</span> <span style="font-weight: 500; color: #E6EDF3;">RAG</span>
            <span style="margin-left:auto; color: #8B949E; font-size: 0.8rem;">{index.ntotal} chunks</span>
        </div>
        """, unsafe_allow_html=True)
    else:
        st.markdown("""
        <div style="background: #161B22; border-left: 3px solid #F85149; padding: 0.8rem; border-radius: 6px; margin-bottom: 0.8rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem;">
            <span>❌</span> <span style="font-weight: 500; color: #E6EDF3;">RAG Offline</span>
        </div>
        """, unsafe_allow_html=True)
        st.code("python step2_build_rag.py", language="bash")

    # TTS Status Card
    if tts_model is not None:
        st.markdown("""
        <div style="background: #161B22; border-left: 3px solid #3FB950; padding: 0.8rem; border-radius: 6px; margin-bottom: 0.8rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem;">
            <span>✅</span> <span style="font-weight: 500; color: #E6EDF3;">TTS Engine</span>
            <span style="margin-left:auto; color: #8B949E; font-size: 0.8rem;">Ready</span>
        </div>
        """, unsafe_allow_html=True)
    else:
        st.markdown("""
        <div style="background: #161B22; border-left: 3px solid #F85149; padding: 0.8rem; border-radius: 6px; margin-bottom: 0.8rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem;">
            <span>❌</span> <span style="font-weight: 500; color: #E6EDF3;">TTS Failed</span>
        </div>
        """, unsafe_allow_html=True)

    # Ollama Status Card
    if ollama_running():
        st.markdown("""
        <div style="background: #161B22; border-left: 3px solid #3FB950; padding: 0.8rem; border-radius: 6px; margin-bottom: 0.8rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem;">
            <span>✅</span> <span style="font-weight: 500; color: #E6EDF3;">Ollama</span>
            <span style="margin-left:auto; color: #8B949E; font-size: 0.8rem;">Online</span>
        </div>
        """, unsafe_allow_html=True)
    else:
        st.markdown("""
        <div style="background: #161B22; border-left: 3px solid #D29922; padding: 0.8rem; border-radius: 6px; margin-bottom: 0.8rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem;">
            <span>⚠️</span> <span style="font-weight: 500; color: #E6EDF3;">Ollama Offline</span>
        </div>
        """, unsafe_allow_html=True)
        st.caption("Terminal run: `ollama serve`")

    # Metric Card
    st.markdown(f"""
    <div style="background: #161B22; border: 1px solid #21262D; padding: 1.5rem; border-radius: 8px; text-align: center; margin: 1.5rem 0;">
        <div style="font-size: 2.8rem; font-weight: 700; color: #E6EDF3; line-height: 1;">{st.session_state.query_count}</div>
        <div style="color: #8B949E; font-size: 0.8rem; margin-top: 0.5rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Queries this session</div>
    </div>
    """, unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════
# HERO
# ═══════════════════════════════════════════════════════
st.markdown("""
<div class="hero">
    <div class="hero-content">
        <h1 style="color: black !important;">ગુજ AI Tutor</h1>
        <p style="color: black !important; font-weight: 600;">Master Gujarati with your personalized AI linguistic guide.</p>
    </div>
</div>
""", unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════
# TABS
# ═══════════════════════════════════════════════════════
tab1, tab2, tab3, tab4, tab5, tab6, tab7 = st.tabs([
    "💬 RAG Chatbot",
    "🎤 Pronunciation",
    "📝 Grammar Quiz",
    "✍️ Transliteration Studio",
    "📊 Benchmark",
    "🌟 Culture & Flashcards",
    "🌐 Online STT"
])

# ───────────────────────────────────────────────────────
# TAB 1 — RAG CHATBOT
# ───────────────────────────────────────────────────────
with tab1:
    st.markdown("<h4 style='color:#E6EDF3; margin-bottom:1rem;'>Ask anything about Gujarati language</h4>", unsafe_allow_html=True)

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

    prefill = st.session_state.pop("_prefill", "")
    user_input = st.text_input(
        "Your question:",
        value=prefill,
        placeholder="e.g. How do I say thank you in Gujarati?",
        label_visibility="collapsed"
    )
    
    stt_file = st.file_uploader("Or upload an audio question (Offline Whisper STT)", type=["wav", "mp3", "m4a", "ogg", "aac"], key="rag_stt")

    c1, c2, c3 = st.columns([1, 1, 2])
    ask   = c1.button("Ask →", type="primary", use_container_width=True)
    clear = c2.button("Clear chat", use_container_width=True)
    speak = c3.checkbox("🔊 Speak answers aloud", value=True)

    if clear:
        st.session_state.messages = []
        st.rerun()

    if ask:
        final_query = ""
        user_text = user_input.strip()
        
        # Proper IF TEXT OR SOUND logic
        if user_text:
            final_query = user_text
        elif stt_file and whisper_model:
            with st.spinner("🎙️ Transcribing audio locally using Whisper..."):
                suffix = Path(stt_file.name).suffix or ".wav"
                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                    tmp.write(stt_file.read())
                    tmp_path = tmp.name
                
                try:
                    import librosa
                    # Load audio directly to numpy array to avoid ffmpeg requirements
                    y, sr = librosa.load(tmp_path, sr=16000)
                    res = whisper_model.transcribe(y)
                    final_query = res.get("text", "").strip()
                    st.success(f"✅ Recognized: {final_query}")
                except Exception as e:
                    st.error(f"❌ Whisper transcription failed: {e}")
                    st.info("Tip: Use .wav files to ensure offline compatibility without ffmpeg installed.")
                finally:
                    if os.path.exists(tmp_path):
                        try:
                            os.unlink(tmp_path)
                        except:
                            pass
        
        if final_query:
            with st.spinner("🧠 Searching knowledge base..."):
                result = rag_answer(final_query)

            st.session_state.query_count += 1
            st.session_state.messages.append({
                "q":      final_query,
                "a":      result["answer"],
                "meta":   f"{result['mode']} · {result['t_total']}s · {', '.join(result['sources'])}",
                "scores": result["scores"],
                "time":   datetime.now().strftime("%H:%M"),
            })

            if speak and tts_model is not None:
                audio = speak_gujarati(result["answer"])
                if audio:
                    st.audio(audio, format="audio/wav", autoplay=True)

    if st.session_state.messages:
        st.markdown("<hr style='border-color: #21262D;'>", unsafe_allow_html=True)
        for turn in reversed(st.session_state.messages):
            ans_html = turn["a"].replace('\n', '<br>')
            
            st.markdown(f"""
            <div class="chat-row-user">
                <div class="chat-bubble-user-wrap">
                    <div class="chat-bubble-user">{turn["q"]}</div>
                    <div class="chat-meta">{turn.get("time", "")}</div>
                </div>
            </div>
            """, unsafe_allow_html=True)
            
            st.markdown(f"""
            <div class="chat-row-bot">
                <div class="bot-avatar">🤖</div>
                <div class="chat-bubble-bot-wrap">
                    <div class="chat-bubble-bot">{ans_html}</div>
                    <div class="chat-meta">{turn.get("time", "")} · {turn["meta"]}</div>
                </div>
            </div>
            """, unsafe_allow_html=True)
            
            with st.expander("🔍 System Context (RAG)"):
                st.caption(f"Cosine similarity scores: {turn['scores']}")

# ───────────────────────────────────────────────────────
# TAB 2 — PRONUNCIATION SCORER
# ───────────────────────────────────────────────────────
with tab2:
    st.markdown("<h4 style='color:#E6EDF3;'>🗣️ Pronunciation Practice</h4>", unsafe_allow_html=True)
    st.caption("Listen and practice these essential Gujarati phrases.")

    WORDS = {
        "નમસ્તે — Hello":        {"phonemes": 3, "level": "Easy",   "color": "#3FB950", "bg": "#1A4731"},
        "ગુજરાત — Gujarat":      {"phonemes": 3, "level": "Easy",   "color": "#3FB950", "bg": "#1A4731"},
        "આભાર — Thank you":      {"phonemes": 2, "level": "Easy",   "color": "#3FB950", "bg": "#1A4731"},
        "કેમ છો — How are you":  {"phonemes": 2, "level": "Medium", "color": "#D29922", "bg": "#341A00"},
        "સારું — Good":          {"phonemes": 2, "level": "Easy",   "color": "#3FB950", "bg": "#1A4731"},
        "ભારત — India":          {"phonemes": 3, "level": "Easy",   "color": "#3FB950", "bg": "#1A4731"},
        "વ્યાકરણ — Grammar":     {"phonemes": 4, "level": "Hard",   "color": "#F85149", "bg": "#3D1717"},
        "સ્વાગત — Welcome":      {"phonemes": 3, "level": "Medium", "color": "#D29922", "bg": "#341A00"},
        "પાણી — Water":          {"phonemes": 2, "level": "Easy",   "color": "#3FB950", "bg": "#1A4731"},
        "ખૂબ સરસ — Very Good":   {"phonemes": 3, "level": "Medium", "color": "#D29922", "bg": "#341A00"},
    }

    word = st.selectbox("Choose a word to practise:", list(WORDS.keys()))
    info = WORDS[word]
    
    st.markdown(f"""
    <div style="margin: 1rem 0; display: flex; align-items: center; gap: 1rem;">
        <span style="color: #8B949E;">Level:</span> 
        <span style="background: {info['bg']}; color: {info['color']}; padding: 2px 12px; border-radius: 999px; font-size: 0.85rem; font-weight: 600;">{info['level']}</span>
        <span style="color: #8B949E; margin-left:1rem;">Syllables:</span> 
        <span style="color: #E6EDF3; font-weight: 600;">{info['phonemes']}</span>
    </div>
    """, unsafe_allow_html=True)

    if st.button("🔊 Hear correct pronunciation", type="primary"):
        word_text = word.split("—")[0].strip()
        if tts_model:
            with st.spinner("Generating..."):
                audio = speak_gujarati(word_text)
            if audio:
                st.audio(audio, format="audio/wav", autoplay=True)
        else:
            st.warning("TTS not loaded")

# ───────────────────────────────────────────────────────
# TAB 3 — GRAMMAR QUIZ
# ───────────────────────────────────────────────────────
with tab3:
    QUESTIONS = [
        {"q": "👋 What does નમસ્તે mean?", "guj": "નમસ્તે",
         "opts": ["Hello / Greetings", "Goodbye", "Thank you", "Sorry"],
         "ans": 0, "hint": "Most common Gujarati greeting"},
        
        {"q": "🎧 Listen to the audio. What word did you hear?", "audio": "આભાર",
         "opts": ["Excuse me", "Thank you", "Please", "How are you"],
         "ans": 1, "hint": "Starts with 'Aa' sound (Gratitude)"},
         
        {"q": "📚 Gujarati sentence structure?", "guj": "વ્યાકરણ",
         "opts": ["SOV — verb at end", "SVO like English", "VSO", "OVS"],
         "ans": 0, "hint": "Verb always comes LAST"},
         
        {"q": "🎧 Listen to the audio. What does this mean?", "audio": "સારું",
         "opts": ["Bad", "Ok / Neutral", "Good", "Excellent"],
         "ans": 2, "hint": "You say this when things are well"},
         
        {"q": "🧑‍🤝‍🧑 How many genders in Gujarati?", "guj": "લિંગ",
         "opts": ["2 like English", "3 — M / F / Neuter", "1", "4"],
         "ans": 1, "hint": "One more than English"},
         
        {"q": "☝️ What does હું mean?", "guj": "હું",
         "opts": ["You", "He/She", "I / Me", "We"],
         "ans": 2, "hint": "First person singular"},
         
        {"q": "⚙️ What does છે (chhe) mean?", "guj": "છે",
         "opts": ["Go", "Is / Am / Are", "Eat", "Come"],
         "ans": 1, "hint": "Most common Gujarati verb"},
    ]

    total = len(QUESTIONS)
    idx   = st.session_state.quiz_idx

    if st.session_state.quiz_done:
        pct   = round(st.session_state.quiz_score / total * 100)
        emoji = "🏆" if pct >= 80 else "👍" if pct >= 60 else "📚"
        st.markdown(f"<div style='text-align:center;font-size:4.5rem; margin-top: 2rem;'>{emoji}</div>", unsafe_allow_html=True)
        st.markdown(f"<div style='text-align:center;font-size:2.5rem;font-weight:800; color: #FFFFFF; margin-bottom: 2rem;'>{st.session_state.quiz_score} / {total} — {pct}%</div>", unsafe_allow_html=True)
        
        c_left, c_mid, c_right = st.columns([1,2,1])
        if c_mid.button("↻ Try again", type="primary", use_container_width=True):
            st.session_state.quiz_idx    = 0
            st.session_state.quiz_score  = 0
            st.session_state.quiz_done   = False
            st.session_state.quiz_chosen = None
            st.rerun()
    else:
        q = QUESTIONS[idx]
        
        st.markdown(f"""
        <div style="background: #161B22; height: 4px; border-radius: 2px; width: 100%; margin-bottom: 0.5rem; overflow: hidden;">
            <div style="background: #FF9933; height: 100%; width: {((idx+1)/total)*100}%; transition: width 0.3s ease;"></div>
        </div>
        """, unsafe_allow_html=True)
        
        st.caption(f"Question {idx+1} of {total}  ·  Current Score: {st.session_state.quiz_score}")

        with st.container(border=True):
            if "audio" in q:
                st.markdown(f"### 🎧 {q['q']}")
                st.caption(f"💡 {q['hint']}")
                audio_bytes = speak_gujarati(q["audio"])
                if audio_bytes:
                    st.audio(audio_bytes, format="audio/wav")
                else:
                    st.warning("Audio unavailable. The word is: " + q["audio"])
            else:
                st.markdown(f'<span class="guj">{q["guj"]}</span>', unsafe_allow_html=True)
                st.markdown(f"### {q['q']}")
                st.caption(f"💡 {q['hint']}")

        chosen = st.session_state.quiz_chosen
        
        # We wrap in a container to isolate these specific buttons for styling
        with st.container():
            st.markdown('<div class="quiz-options-marker"></div>', unsafe_allow_html=True)
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

            # Dynamic CSS to color correct/incorrect buttons
            if chosen is not None:
                ans_idx = q["ans"] + 2 # Offset by 1 for the marker HTML
                chosen_idx = chosen + 2
                
                css = f"""<style>
                /* Correct Option */
                div[data-testid="stVerticalBlock"]:has(.quiz-options-marker) > div[data-testid="element-container"]:nth-child({ans_idx}) button {{
                    border: 1px solid #3FB950 !important;
                    background: #1A4731 !important;
                }}
                </style>"""
                if chosen != q["ans"]:
                    css += f"""<style>
                    /* Wrong Option */
                    div[data-testid="stVerticalBlock"]:has(.quiz-options-marker) > div[data-testid="element-container"]:nth-child({chosen_idx}) button {{
                        border: 1px solid #F85149 !important;
                        background: #3D1717 !important;
                    }}
                    </style>"""
                st.markdown(css, unsafe_allow_html=True)

        if chosen is not None:
            if idx < total - 1:
                if st.button("Next Question →", type="primary"):
                    st.session_state.quiz_idx   += 1
                    st.session_state.quiz_chosen = None
                    st.rerun()
            else:
                if st.button("See Final Score →", type="primary"):
                    st.session_state.quiz_done = True
                    st.rerun()

# ───────────────────────────────────────────────────────
# TAB 4 — TRANSLITERATION STUDIO
# ───────────────────────────────────────────────────────
with tab4:
    st.markdown("<h4 style='color:#E6EDF3;'>✍️ Transliteration Studio</h4>", unsafe_allow_html=True)
    st.caption("Type in English phonetics and instantly convert to Gujarati script + Audio.")

    c1, c2 = st.columns([1, 1])
    
    with c1:
        st.markdown("**1. Type English (ITRANS format):**")
        english_input = st.text_area("English Input", placeholder="Type here... e.g., 'kem chho'", height=120, label_visibility="collapsed")
        
        translate_btn = st.button("Convert to Gujarati", type="primary", use_container_width=True)
        
    with c2:
        st.markdown("**2. Resulting Gujarati:**")
        if translate_btn and english_input.strip():
            converted_guj = transliterate_to_gujarati(english_input)
            
            st.markdown(f"""
            <div style="background: #161B22; border: 1px solid #30363D; border-radius: 8px; padding: 1rem; min-height: 120px; color: #FF9933; font-size: 1.5rem; font-family: 'Noto Sans Gujarati', Inter, sans-serif;">
                {converted_guj}
            </div>
            """, unsafe_allow_html=True)
            
            audio_bytes = speak_gujarati(converted_guj)
            if audio_bytes:
                st.markdown("**Audio Preview:**")
                st.audio(audio_bytes, format="audio/wav")
            else:
                st.caption("Audio unavailable for this text.")
        else:
            st.markdown("""
            <div style="background: #161B22; border: 1px solid #30363D; border-radius: 8px; padding: 1rem; min-height: 120px; display: flex; align-items: center; justify-content: center; color: #8B949E;">
                Output will appear here...
            </div>
            """, unsafe_allow_html=True)

# ───────────────────────────────────────────────────────
# TAB 5 — BENCHMARK
# ───────────────────────────────────────────────────────
with tab5:
    st.markdown("<h4 style='color:#E6EDF3;'>Evaluate Model Capabilities</h4>", unsafe_allow_html=True)
    st.caption("Tests 10 standard queries and measures QA accuracy + latency.")

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

    if st.button("▶ Run Full Benchmark", type="primary"):
        results  = []
        p_html = st.empty()
        status   = st.empty()

        for i, test in enumerate(TESTS):
            status.markdown(f"**Executing Query {i+1}/10:** `{test['q']}`", unsafe_allow_html=True)
            p_html.markdown(f"""
            <div style="background: #21262D; height: 6px; border-radius: 3px; width: 100%; margin-bottom: 1rem; overflow: hidden;">
                <div style="background: #FF9933; height: 100%; width: {((i)/10)*100}%; transition: width 0.3s ease;"></div>
            </div>
            """, unsafe_allow_html=True)
            
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

        p_html.empty()
        status.empty()

        import pandas as pd
        df = pd.DataFrame(results)
        
        st.dataframe(df, use_container_width=True, hide_index=True, column_config={
            "✓": st.column_config.TextColumn("Status", width="small"),
            "Time (s)": st.column_config.NumberColumn("Wait Time", format="%.2f s", width="small")
        })

        correct_n = sum(1 for r in results if r["✓"] == "✅")
        accuracy  = correct_n / len(results) * 100
        avg_time  = df["Time (s)"].mean()

        c1, c2, c3 = st.columns(3)
        acc_color = "#3FB950" if accuracy >= 70 else "#D29922" if accuracy >= 50 else "#F85149"
        mode_val = "RAG+LLM" if "Gemma" in results[0]["Mode"] else "RAG only"

        with c1:
            st.markdown(f"""
            <div style="background: #161B22; border-top: 3px solid {acc_color}; padding: 1.5rem; border-radius: 6px; text-align: center;">
                <div style="font-size: 2.2rem; font-weight: bold; color: {acc_color};">{accuracy:.0f}%</div>
                <div style="color: #8B949E; font-size: 0.8rem; text-transform: uppercase; margin-top: 0.5rem; font-weight: 600;">Accuracy ({correct_n}/10)</div>
            </div>
            """, unsafe_allow_html=True)
        with c2:
            st.markdown(f"""
            <div style="background: #161B22; border-top: 3px solid #FF9933; padding: 1.5rem; border-radius: 6px; text-align: center;">
                <div style="font-size: 2.2rem; font-weight: bold; color: #E6EDF3;">{avg_time:.2f}s</div>
                <div style="color: #8B949E; font-size: 0.8rem; text-transform: uppercase; margin-top: 0.5rem; font-weight: 600;">Avg Response Time</div>
            </div>
            """, unsafe_allow_html=True)
        with c3:
            st.markdown(f"""
            <div style="background: #161B22; border-top: 3px solid #1F6FEB; padding: 1.5rem; border-radius: 6px; text-align: center;">
                <div style="font-size: 1.4rem; font-weight: bold; color: #E6EDF3; padding: 0.4rem 0;">{mode_val}</div>
                <div style="color: #8B949E; font-size: 0.8rem; text-transform: uppercase; margin-top: 0.5rem; font-weight: 600;">Fallback Chain</div>
            </div>
            """, unsafe_allow_html=True)

        if accuracy >= 70:
            st.success(f"🎉 Validation passed successfully! Your agent is ready.")
        else:
            st.warning("⚠️ Consider iterating on standard document chunks in your knowledge directory.")


# ───────────────────────────────────────────────────────
# TAB 6 — CULTURE & FLASHCARDS
# ───────────────────────────────────────────────────────
with tab6:
    st.markdown("<h4 style='color:#E6EDF3;'>🌟 Gujarati Culture & Concepts</h4>", unsafe_allow_html=True)
    st.caption("Expand your understanding of Gujarat's rich heritage.")
    
    cards = [
        {"title": "💃 Garba (ગરબા)", "desc": "A traditional, joyous folk dance performed during the Navratri festival, reflecting devotion and vibrant community life."},
        {"title": "🥘 Dhokla (ઢોકળા)", "desc": "A legendary savory, spongy snack made from fermented batter of rice and split chickpeas. A staple of Gujarati cuisine."},
        {"title": "🪁 Kite Festival (ઉત્તરાયણ)", "desc": "Celebrated worldwide in January, marking the end of winter. Skies are filled with thousands of colorful fighting kites (Patang)."}
    ]
    
    cols = st.columns(3)
    for i, c in enumerate(cards):
        with cols[i]:
            card_html = f"""
            <div style="background: #161B22; border: 1px solid #30363D; border-radius: 12px; padding: 1.5rem; height: 100%; transition: transform 0.2s;">
                <div style="font-size: 1.4rem; font-weight: 700; color: #FF9933; margin-bottom: 0.5rem; font-family: 'Noto Sans Gujarati', Inter, sans-serif;">{c['title']}</div>
                <div style="color: #C9D1D9; font-size: 0.95rem; line-height: 1.5;">{c['desc']}</div>
            </div>
            """
            st.markdown(card_html, unsafe_allow_html=True)

    st.markdown("---")
    st.markdown("#### Word of the Day")
    st.markdown(f"""
    <div style="background: linear-gradient(135deg, rgba(255,153,51,0.1), rgba(0,0,0,0)); border: 1px solid #FF9933; padding: 2rem; border-radius: 12px; text-align: center;">
        <div style="font-size: 4rem; color: #E6EDF3; font-weight: 800; line-height: 1;">સ્વાગત</div>
        <div style="color: #FF9933; font-size: 1.5rem; font-weight: 500; margin: 0.5rem 0;">(Swagat)</div>
        <div style="color: #8B949E; font-size: 1.2rem; margin-top: 0.5rem;">Meaning: Welcome / Welcoming someone to your space</div>
    </div>
    """, unsafe_allow_html=True)


# ───────────────────────────────────────────────────────
# TAB 7 — ONLINE STT (Google API)
# ───────────────────────────────────────────────────────
with tab7:
    st.markdown("<h4 style='color:#E6EDF3;'>🌐 Secondary Online Speech-To-Text</h4>", unsafe_allow_html=True)
    st.caption("Requires internet. Powered by Google Speech Recognition.")
    
    col1, col2 = st.columns(2)
    with col1:
        st.markdown("**1. Upload Audio File**")
        google_audio_file = st.file_uploader("Upload audio file", type=["wav", "aiff", "flac"], key="google_stt_file", label_visibility="collapsed")
    with col2:
        st.markdown("**2. Or Record Live Audio**")
        google_audio_mic = st.audio_input("Record a voice message", key="google_stt_mic", label_visibility="collapsed")
    
    # Use mic if provided, otherwise file
    active_google_audio = google_audio_mic if google_audio_mic else google_audio_file
    
    if st.button("Transcribe Audio Online", type="primary") and active_google_audio:
        with st.spinner("Processing using Google API..."):
            try:
                import speech_recognition as sr
                suffix = Path(active_google_audio.name).suffix or ".wav"
                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                    tmp.write(active_google_audio.read())
                    tmp_path = tmp.name
                
                r = sr.Recognizer()
                with sr.AudioFile(tmp_path) as source:
                    audio_data = r.record(source)
                
                text = r.recognize_google(audio_data)
                guj_text = transliterate_to_gujarati(text)
                
                st.success("Recognition Complete!")
                st.markdown(f"""
                <div style="background: #161B22; border-left: 3px solid #3FB950; padding: 1.5rem; border-radius: 6px;">
                    <div style="color: #8B949E; margin-bottom: 0.5rem; font-size: 0.85rem; font-weight: 600; text-transform: uppercase;">Recognized Text (English)</div>
                    <div style="color: #E6EDF3; font-size: 1.1rem; line-height: 1.6; margin-bottom: 1rem;">{text}</div>
                    <div style="color: #8B949E; margin-bottom: 0.5rem; font-size: 0.85rem; font-weight: 600; text-transform: uppercase;">Transliterated (Gujarati)</div>
                    <div style="color: #FF9933; font-size: 1.4rem; line-height: 1.6; font-family: 'Noto Sans Gujarati', Inter, sans-serif;">{guj_text}</div>
                </div>
                """, unsafe_allow_html=True)
                
            except ImportError:
                st.error("Missing `SpeechRecognition` library. Please `pip install SpeechRecognition`")
            except sr.UnknownValueError:
                st.error("Google Speech Recognition could not understand the audio.")
            except sr.RequestError as e:
                st.error(f"Could not request results from Google Speech Recognition service; {e}")
            except Exception as e:
                st.error(f"An error occurred reading this file type. Please try again or use a WAV file. Details: {e}")
            finally:
                if 'tmp_path' in locals() and os.path.exists(tmp_path):
                    os.unlink(tmp_path)
