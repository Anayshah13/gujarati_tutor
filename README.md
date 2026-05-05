<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=138808&height=200&section=header&text=Guj-Gyani&fontSize=80&fontColor=ffffff&desc=Your%20AI%20Gujarati%20Linguistic%20Guide&descAlignY=75&descAlign=62" />
  
  <p align="center">
    <b>Master Gujarati with your personalized AI tutor.</b> <br/>
    <i>Offline-first, rich interactive UI, AI Chatbots, Audio Pronunciation Scoring, and much more!</i>
  </p>
  
  <img src="https://img.shields.io/badge/Streamlit-FF4B4B?style=for-the-badge&logo=Streamlit&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Ollama-FFFFFF?style=for-the-badge&logo=Ollama&logoColor=black" />
  <img src="https://img.shields.io/badge/Whisper-1A4731?style=for-the-badge&logo=OpenAI&logoColor=white" />
</div>

<br/>

## ✨ Introduction

**Guj-Gyani** is an advanced, offline-capable AI educational platform designed to teach the Gujarati language dynamically and interactively. By combining state-of-the-art Natural Language Processing (via Ollama/Gemma-2B), localized Retrieval-Augmented Generation (RAG), and Offline Automatic Speech Recognition (Whisper), it delivers a native, frictionless linguistic interface for both new learners and native speakers.

---

## 🚀 Key Features

### 💬 `1.` RAG Offline Chatbot (Audio & Text)
- **Knowledge Base Retrieval:** Ask anything natively. The bot retrieves answers purely from standard local Gujarati linguistic syntax. 
- **Offline Audio Queries:** Tired of typing? Upload a `.wav` file or record directly, and **Offline Whisper API** will transcribe your query and pass it to the RAG system!
- **Phonetic Context Alignment:** Type `kem chho` and the system injects `કેમ છો` out-of-the-box using the smart transliteration context integration.

### 🗣️ `2.` Pronunciation Studio
- Access built-in Gujarati terminology practice levels (Easy to Hard).
- Hear exact textual phrasing and analyze phonetic breakdowns.
- *Listen native, speak accurately.*

### 📝 `3.` Grammar Quizzes
- Test your linguistic knowledge dynamically through multiple-choice visual cards.
- Supports inline text questions and inline audio listening challenges.
- Immediate visual and tactile feedback loops.

### 🔠 `4.` Transliteration Sandbox
- Instantly convert English (`ITRANS`) phonetic formats (e.g. `kem chho`) instantly to structured Gujarati script (`કેમ છો`).
- Features inline TTS to hear what you successfully transliterated.

### 📊 `5.` Benchmark Mode
- A robust engine integrity metric to validate 10 standard queries and measure QA Accuracy + RAG Response Latency.
- Ensures your vectors and chunk retrieval processes are acting deterministically.

### 🌐 `6.` Google STT Online Suite
- An exclusive online endpoint bridging local users with the Google Web Speech API. 
- Upload or record your voice directly in the browser!
- Evaluates English syntax and automatically cascades to **transliterate** it into Native Gujarati text dynamically on the dashboard.

---

## 🛠️ Architecture & Under the Hood

### 🎨 Fully Custom UX
- Zero basic web components. Engineered entirely atop custom CSS parameters mapping exact dark glassmorphism gradients and explicit UI micro-interactions.
- **100% Mobile Responsive:** Built with progressive rendering CSS strategies to look flawless on mobile. Hover animations included!

### ⚙️ Engine Stack
- **LLM Engine:** Local Ollama (running `gemma2:2b`).
- **Embedding / Vector Search:** `sentence-transformers` coupled with `faiss-cpu`.
- **Offline STT Engine:** OpenCV's `Whisper` + Librosa for numpy chunk manipulation (zero FFmpeg dependencies).
- **TTS Generator:** HuggingFace `facebook/mms-tts-guj`.

---

## 🎮 How to Run (Local)

<details>
<summary><b>Installation Requirements</b></summary>

You will need Python 3.9+ along with these core dependancies:

```bash
pip install streamlit transformers torch faiss-cpu sentence-transformers indic_transliteration soundfile requests librosa openai-whisper SpeechRecognition
```
</details>

### Phase 1: Boot Up Ollama
Ensure your Ollama local LLM application is running in the background. Open a terminal and run:
```bash
ollama serve
```
*(Make sure to pull Gemma 2B first if you haven't: `ollama pull gemma2:2b`)*

### Phase 2: Create the Vector Brain
If this is your first time, build the `FAISS` chunked vector-store from the text assets:
```bash
python step2_build_rag.py
```

### Phase 3: Launch Web App
Boot the custom Streamlit Interface:
```bash
streamlit run step3_app.py
```

---
<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=FF9933&height=100&section=footer" />
</div>
