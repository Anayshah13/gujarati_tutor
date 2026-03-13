from transformers import VitsModel, AutoTokenizer
import torch
import soundfile as sf

print("Loading Gujarati TTS model...")

model = VitsModel.from_pretrained("facebook/mms-tts-guj")
tokenizer = AutoTokenizer.from_pretrained("facebook/mms-tts-guj")

print("Model loaded successfully!")

text = input("Enter Gujarati text: ")

inputs = tokenizer(text, return_tensors="pt")

with torch.no_grad():
    output = model(**inputs).waveform

sf.write("outputuu.wav", output.squeeze().numpy(), model.config.sampling_rate)

print("Audio saved as outputuu.wav")

#  ગુજરાતીમાં સામાન્ય અને ઉપયોગી વાક્યો: તમે કેમ છો?, મને સારું છે, તમારું નામ શું છે?.