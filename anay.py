import sounddevice as sd
import soundfile as sf
from faster_whisper import WhisperModel
from indic_transliteration import sanscript
from indic_transliteration.sanscript import transliterate
import numpy as np
import os

# ── CONFIG ────────────────────────────────────────────────
DURATION    = 5        # seconds to record
SAMPLERATE  = 16000
MODEL_SIZE  = "medium" # small / medium / large
LANGUAGE    = "gu"     # gu = Gujarati
TEMP_FILE   = "temp.wav"
# ─────────────────────────────────────────────────────────

def load_model():
    print(f"Loading Whisper {MODEL_SIZE} model...")
    model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
    print("✅ Model loaded!\n")
    return model

def record_audio(duration=DURATION):
    print(f"🎙️  Recording for {duration} seconds... speak now!")
    audio = sd.rec(
        int(duration * SAMPLERATE),
        samplerate=SAMPLERATE,
        channels=1,
        dtype='float32'
    )
    sd.wait()

    # check if mic actually picked something up
    volume = np.sqrt(np.mean(audio**2))
    if volume < 0.001:
        print("⚠️  Mic volume very low — check your microphone")
        return False

    sf.write(TEMP_FILE, audio, SAMPLERATE)
    print("✅ Done recording!\n")
    return True

def devanagari_to_gujarati(text):
    result = ""
    for char in text:
        code = ord(char)
        if 0x0900 <= code <= 0x097F:
            result += chr(code + 0x0180)
        else:
            result += char
    return result

def transcribe(model):
    segments, info = model.transcribe(
        TEMP_FILE,
        language=LANGUAGE,
        beam_size=5,
        vad_filter=True,
        temperature=0.0,
        task="transcribe",
        without_timestamps=True
    )

    raw = "".join([s.text for s in segments]).strip()

    if not raw:
        print("❌ Nothing detected — try speaking louder or closer to mic")
        return

    gujarati  = devanagari_to_gujarati(raw)
    roman     = transliterate(gujarati, sanscript.GUJARATI, sanscript.ITRANS)

    print(f"Detected language : {info.language} (confidence: {info.language_probability:.2f})")
    print(f"Raw Whisper       : {raw}")
    print(f"Gujarati script   : {gujarati}")
    print(f"Roman letters     : {roman}")

def cleanup():
    if os.path.exists(TEMP_FILE):
        os.remove(TEMP_FILE)

# ── MAIN LOOP ─────────────────────────────────────────────
model = load_model()

while True:
    print("─" * 45)
    cmd = input("Press ENTER to record | type 'q' to quit: ").strip().lower()
    if cmd == 'q':
        print("Bye!")
        cleanup()
        break

    if record_audio():
        transcribe(model)