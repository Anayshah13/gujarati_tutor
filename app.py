import streamlit as st
import whisper
import ollama
from transformers import VitsModel, AutoTokenizer
import torch
import soundfile as sf
import chromadb
from sentence_transformers import SentenceTransformer
from audiorecorder import audiorecorder
import io
import os
import tempfile
from pypdf import PdfReader
import uuid

st.set_page_config(layout="wide", page_title="ઑફ્લાઇન ગુજરાતી ટ્યૂટર", page_icon="🇮🇳")

@st.cache_resource
def load_whisper():
    print("Loading Whisper model...")
    return whisper.load_model("small")

@st.cache_resource
def load_tts():
    print("Loading MMS-TTS model...")
    model = VitsModel.from_pretrained("facebook/mms-tts-guj")
    tokenizer = AutoTokenizer.from_pretrained("facebook/mms-tts-guj")
    return model, tokenizer

@st.cache_resource
def load_embed():
    print("Loading embedding model...")
    return SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")

@st.cache_resource
def load_chroma():
    print("Initializing ChromaDB...")
    client = chromadb.PersistentClient(path="./chroma_db")
    collection = client.get_or_create_collection("gujarati_kb")
    return client, collection

whisper_model = load_whisper()
tts_model, tts_tokenizer = load_tts()
embed_model = load_embed()
chroma_client, collection = load_chroma()

def chunk_text(text, chunk_size=400, overlap=50):
    chunks = []
    i = 0
    while i < len(text):
        chunks.append(text[i:i+chunk_size])
        i += chunk_size - overlap
    return chunks

left_col, right_col = st.columns([2, 1])

with right_col:
    st.subheader("📚 Knowledge Base")
    uploaded_files = st.file_uploader("Upload context (TXT/PDF)", accept_multiple_files=True, type=['txt', 'pdf'])
    
    if uploaded_files:
        for file in uploaded_files:
            text = ""
            if file.name.endswith(".pdf"):
                reader = PdfReader(file)
                for page in reader.pages:
                    text += page.extract_text() + "\n"
            else:
                text = file.read().decode("utf-8")
                
            if text.strip():
                chunks = chunk_text(text)
                for c in chunks:
                    if c.strip():
                        emb = embed_model.encode(c).tolist()
                        collection.add(
                            embeddings=[emb],
                            documents=[c],
                            metadatas=[{"source": file.name}],
                            ids=[str(uuid.uuid4())]
                        )
        st.success("Files processed and added to KB!")
        
    st.write(f"Current chunk count: {collection.count()}")
    
    if st.button("Clear knowledge base"):
        try:
            chroma_client.delete_collection("gujarati_kb")
            collection = chroma_client.get_or_create_collection("gujarati_kb")
        except:
            pass
        st.cache_resource.clear()
        st.rerun()

    st.divider()
    st.markdown("""
    ### How to use
    - **Voice Input**: Use the microphone component **"hold to speak"** to speak in Gujarati. The speech will be transcribed and automatically sent.
    - **Text Input**: Type Gujarati text directly in the chat input.
    - **RAG**: Upload documents to let the AI tutor answer based on specific context.
    """)

with left_col:
    st.title("ઑફ્લાઇન ગુજરાતી ટ્યૂટર 🇮🇳")
    
    audio = audiorecorder("hold to speak", "Recording...")
    
    transcribed_text = ""
    if len(audio) > 0:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(audio.export().read())
            tmp_path = tmp.name
        
        try:
            with st.spinner("Transcribing audio..."):
                result = whisper_model.transcribe(tmp_path, language="gu")
                transcribed_text = result["text"].strip()
        except Exception as e:
            st.error(f"Transcription failed: {str(e)}")
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    if "messages" not in st.session_state:
        st.session_state.messages = []

    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    user_input = st.chat_input("ટાઇપ કરો...")
    
    final_input = transcribed_text if transcribed_text else user_input

    if final_input:
        st.session_state.messages.append({"role": "user", "content": final_input})
        with st.chat_message("user"):
            st.markdown(final_input)

        system_prompt = """
તમે 'ગુજ્ઞાની' છો — એક ઑફ્લાઇન ગુજરાતી AI ટ્યૂટર.
નિયમો:
- હંમેશા ગુજરાતી લિપિમાં જ જવાબ આપો.
- ટૂંકા, સ્પષ્ટ અને મૈત્રીપૂર્ણ જવાબ આપો.
- જો RAG context મળ્યો હોય તો તેનો ઉપયોગ કરો.
"""
        context_str = ""
        if collection.count() > 0:
            query_emb = embed_model.encode(final_input).tolist()
            results = collection.query(query_embeddings=[query_emb], n_results=3)
            if results['documents'] and results['documents'][0]:
                context_str = "\n---\n".join(results['documents'][0])
                system_prompt += f"\nReference:\n{context_str}"

        messages_for_llm = [{"role": "system", "content": system_prompt}]
        for msg in st.session_state.messages:
            messages_for_llm.append({"role": msg["role"], "content": msg["content"]})

        with st.chat_message("assistant"):
            try:
                response_stream = ollama.chat(model="gemma3:1b", messages=messages_for_llm, stream=True)
                
                def yield_chunks():
                    for chunk in response_stream:
                        yield chunk['message']['content']
                
                reply_text = st.write_stream(yield_chunks())
                st.session_state.messages.append({"role": "assistant", "content": reply_text})
                
                try:
                    inputs = tts_tokenizer(reply_text, return_tensors="pt")
                    with torch.no_grad():
                        waveform = tts_model(**inputs).waveform
                    buf = io.BytesIO()
                    sf.write(buf, waveform.squeeze().numpy(), tts_model.config.sampling_rate, format="WAV")
                    buf.seek(0)
                    st.audio(buf, format="audio/wav", autoplay=True)
                except Exception as e:
                    st.warning(f"TTS failed: {str(e)}")
                    
            except Exception as e:
                st.error(f"Is Ollama running? Run: ollama serve\nDetails: {str(e)}")
