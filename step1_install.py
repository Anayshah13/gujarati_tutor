"""
STEP 1 — Run this first.
Command: python step1_install.py

Installs everything needed. Safe to run multiple times.
"""
import subprocess, sys

packages = [
    "streamlit",
    "sentence-transformers",
    "faiss-cpu",
    "transformers",
    "torch",
    "soundfile",
    "numpy",
    "requests",
    "pandas",
    "librosa",
]

print("=" * 50)
print("  Installing packages...")
print("=" * 50)

failed = []
for p in packages:
    print(f"\n  Installing {p}...", end=" ", flush=True)
    r = subprocess.run(
        [sys.executable, "-m", "pip", "install", p, "-q"],
        capture_output=True, text=True
    )
    if r.returncode == 0:
        print("✅")
    else:
        print("❌")
        failed.append(p)

print("\n" + "=" * 50)
if failed:
    print(f"  ⚠️  These failed: {failed}")
    print("  Try installing them manually:")
    for p in failed:
        print(f"    pip install {p}")
else:
    print("  ✅ All packages installed!")
    print("\n  Next step: python step2_build_rag.py")
print("=" * 50)
