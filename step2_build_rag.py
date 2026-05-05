"""
STEP 2 — Build the RAG knowledge index.
Command: python step2_build_rag.py

What this does:
  1. Reads all .txt files from gujarati_knowledge/
  2. Splits them into overlapping 300-character chunks
  3. Converts each chunk into a 384-number vector (embedding)
     using a multilingual model that understands Gujarati
  4. Saves everything to rag_data/ for instant loading

Only needs to run ONCE. Re-run only if you add new .txt files.
"""

import os, pickle, time
from pathlib import Path
from tqdm import tqdm

def build():
    print("=" * 52)
    print("  Building Gujarati RAG Knowledge Index")
    print("=" * 52)

    # ── 1. Read text files ───────────────────────────────────
    kb_dir = Path("gujarati_knowledge")
    if not kb_dir.exists():
        print("\n❌  gujarati_knowledge/ folder not found!")
        print("   Make sure you're running from the project folder.")
        return False

    files = sorted(kb_dir.glob("*.txt"))
    if not files:
        print("\n❌  No .txt files in gujarati_knowledge/")
        return False

    all_chunks, all_sources = [], []
    print(f"\n  📂 Reading {len(files)} files...")

    for f in tqdm(files, desc="  Reading & Splitting", ncols=80, colour="blue"):
        time.sleep(0.1)  # Simulate progress for fast operations
        text = f.read_text(encoding="utf-8", errors="ignore")
        # Split into overlapping chunks so context isn't cut mid-sentence
        size, overlap = 300, 60
        start = 0
        file_chunks = []
        while start < len(text):
            chunk = text[start:start + size].strip()
            if chunk:
                file_chunks.append(chunk)
            start += size - overlap

        all_chunks.extend(file_chunks)
        all_sources.extend([f.name] * len(file_chunks))
        print(f"     ✅ {f.name:35s} → {len(file_chunks)} chunks")

    print(f"\n  Total: {len(all_chunks)} chunks")

    # ── 2. Load multilingual embedding model ────────────────
    print("\n  Loading embedding model...")
    print("  (Downloads ~120MB first time, then cached offline)")
    
    for _ in tqdm(range(100), desc="  Preparing & Loading", ncols=80, colour="green"):
        time.sleep(0.015)
        
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
    print("  ✅ Model loaded")

    # ── 3. Create embeddings ─────────────────────────────────
    print("\n  Creating embeddings (converting text → numbers)...")
    embeddings = model.encode(
        all_chunks,
        show_progress_bar=True,
        batch_size=32,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    print(f"  ✅ Shape: {embeddings.shape}")

    # ── 4. Build FAISS index ─────────────────────────────────
    print("\n  Building FAISS search index...")
    for _ in tqdm(range(50), desc="  Indexing Vectors", ncols=80, colour="cyan"):
        time.sleep(0.01)
    import faiss
    index = faiss.IndexFlatIP(embeddings.shape[1])
    index.add(embeddings)
    print(f"  ✅ {index.ntotal} vectors indexed")

    # ── 5. Save ──────────────────────────────────────────────
    os.makedirs("rag_data", exist_ok=True)
    for _ in tqdm(range(20), desc="  Saving Data", ncols=80, colour="magenta"):
        time.sleep(0.02)
    faiss.write_index(index, "rag_data/gujarati.index")
    with open("rag_data/chunks.pkl", "wb") as f:
        pickle.dump({"chunks": all_chunks, "sources": all_sources}, f)

    print("\n  ✅ Saved to rag_data/")
    print("\n  Next step: streamlit run step3_app.py")
    print("=" * 52)
    return True

if __name__ == "__main__":
    build()
