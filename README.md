# ગુજ AI Tutor — Offline Gujarati Language Tutor
### DJ Sanghvi College of Engineering | Information Technology
### IPD Project 2025-26 | Team Members: Sakshi Shah, Anay Shah, Keya Divecha, Shubham Jain
### Guide: Mr. Chandrashekhar Badgujar

---

## 📌 Project Overview

An offline, speech-first AI tutor for learning the Gujarati language. The system uses Retrieval Augmented Generation (RAG) to answer questions from a curated Gujarati knowledge base, Text-to-Speech (TTS) to speak answers aloud in Gujarati, a pronunciation scorer to give real-time feedback on spoken Gujarati, and an interactive grammar quiz.

No internet connection is required after the initial model downloads. All AI runs locally on the user's machine.

---

## 🧠 System Architecture

```
User Question (text)
        ↓
   RAG Pipeline
   ├── Embed query using sentence-transformers
   ├── Search FAISS index for top-3 relevant chunks
   └── Feed chunks + question to Gemma 2B (Ollama)
        ↓
   Gemma 2B generates grounded answer
        ↓
   TTS Engine (facebook/mms-tts-guj)
   converts answer text → Gujarati speech
        ↓
   User hears the answer
```

---

## 🗂️ Project Structure

```
guj_final/
├── step1_install.py          — installs all Python packages
├── step2_build_rag.py        — builds FAISS index from knowledge base
├── step3_app.py              — main Streamlit application
├── gujarati_knowledge/       — your dataset text files
│   ├── 01_grammar.txt
│   └── 02_vocabulary.txt
├── rag_data/                 — auto-generated after step 2
│   ├── gujarati.index        — FAISS vector index
│   └── chunks.pkl            — text chunks + metadata
└── tts_cache/                — cached TTS audio files
```

---

## ⚙️ Prerequisites

- Python 3.9 or above
- pip
- Ollama — download from https://ollama.com

---

## 🚀 How to Run (Step by Step)

### Step 1 — Install Python packages

Open a terminal in the project folder and run:
```bash
pip install sentence-transformers faiss-cpu streamlit transformers torch soundfile numpy requests pandas librosa
```

### Step 2 — Start Ollama

Open a **new terminal** and run:
```bash
ollama serve
```
Leave this terminal open and running.

### Step 3 — Download Gemma 2B

Open **another new terminal** and run:
```bash
ollama pull gemma2:2b
```
This downloads ~1.5GB. Wait for it to complete.

### Step 4 — Add your dataset files

Copy your Gujarati `.txt` files into the `gujarati_knowledge/` folder.
Each file is automatically indexed. More files = better answers.

### Step 5 — Build the RAG index

In your original terminal run:
```bash
python step2_build_rag.py
```
Expected output:
```
✅ 01_grammar.txt → 18 chunks
✅ 02_vocabulary.txt → 22 chunks
✅ FAISS index built with 40 vectors
✅ Saved to rag_data/
```

### Step 6 — Run the app

```bash
streamlit run step3_app.py
```

Browser opens automatically at: **http://localhost:8501**

---

## 🖥️ Terminal Layout During Demo

| Terminal | Command | Purpose |
|---|---|---|
| Terminal 1 | `streamlit run step3_app.py` | Main app |
| Terminal 2 | `ollama serve` | LLM backend |

---

## 📱 Features

| Feature | Description |
|---|---|
| 💬 RAG Chatbot | Ask any Gujarati language question. Answers grounded in your dataset. |
| 🎤 Pronunciation Scorer | Upload audio recording. Get 0–100 score with sub-scores. |
| 📝 Grammar Quiz | 7 multiple choice questions with instant feedback. |
| 📊 Benchmark | Run 10 test questions. Get accuracy % and response times for report. |

---

## 🤖 Models Used

| Model | Purpose | Size | Source |
|---|---|---|---|
| `paraphrase-multilingual-MiniLM-L12-v2` | Text embeddings for RAG search | ~120MB | HuggingFace |
| `gemma2:2b` | LLM answer generation | ~1.5GB | Google via Ollama |
| `facebook/mms-tts-guj` | Gujarati text-to-speech | ~300MB | Meta via HuggingFace |

All models are pre-trained. No training was performed by this project.

---

## 💡 Key Technical Concepts

**RAG (Retrieval Augmented Generation)**
Instead of fine-tuning the LLM on Gujarati data (which requires expensive GPUs and days of training), RAG keeps the knowledge external in text files. When a question is asked, the system retrieves the most relevant chunks and feeds them to the LLM as context. This prevents hallucination and allows the knowledge base to be updated by simply adding text files.

**Embeddings**
Text is converted to vectors of 384 numbers using a multilingual sentence transformer. Similar meaning = similar numbers. This enables semantic search — finding relevant content even when the exact words don't match.

**FAISS**
Facebook AI Similarity Search. An index that stores all chunk vectors and finds the nearest matches to a query vector in milliseconds, even with thousands of chunks.

**TTS — facebook/mms-tts-guj**
A VITS (Variational Inference with adversarial learning for end-to-end Text-to-Speech) model trained specifically on Gujarati by Meta's Massively Multilingual Speech project. Converts Gujarati text to natural-sounding speech entirely offline.

---

## 📊 Benchmark Results

Run the Benchmark tab in the app to generate live results.
Target metrics:
- RAG retrieval accuracy: 70%+
- Average response time: 2-5 seconds
- TTS generation: ~1 second per sentence

---

## 🔧 Troubleshooting

| Problem | Fix |
|---|---|
| `ModuleNotFoundError: sentence_transformers` | `pip install sentence-transformers` |
| `ModuleNotFoundError: faiss` | `pip install faiss-cpu` |
| Ollama offline warning in app | Run `ollama serve` in a separate terminal |
| RAG index not found | Run `python step2_build_rag.py` |
| App shows RAG only mode | Ollama not running or `gemma2:2b` not pulled |
| TTS not loading | Run `pip install transformers torch soundfile` |

---

## 🗺️ Future Roadmap

- **Phase 2:** STT integration using OpenAI Whisper for voice input
- **Phase 3:** 4-bit quantization of Gemma 2B for on-device mobile deployment
- **Phase 4:** Flutter Android app with on-device RAG + LLM

---

## 📚 References

- Lewis et al. (2020). Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks. NeurIPS.
- Pratap et al. (2023). Scaling Speech Technology to 1,000+ Languages. Meta AI.
- Johnson et al. (2019). Billion-scale similarity search with GPUs. Facebook AI Research.
- Google DeepMind. (2024). Gemma: Open Models Based on Gemini Research and Technology.
