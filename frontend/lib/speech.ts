type SpeechRecoInstance = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  abort(): void
  stop(): void
  onresult: ((ev: { results: SpeechRecoResultList }) => void) | null
  onerror: ((ev: unknown) => void) | null
  onend: (() => void) | null
}

type SpeechRecoResultList = ArrayLike<{ 0: { transcript: string } }>

type RecognitionCtor = new () => SpeechRecoInstance

let activeRecognition: SpeechRecoInstance | null = null

export function abortRecognition(): void {
  if (typeof window === 'undefined') return
  try {
    activeRecognition?.abort()
  } catch {
    try {
      activeRecognition?.stop()
    } catch {
      /* noop */
    }
  }
  activeRecognition = null
}

/** Prime Chromium voices without assigning synthesis.onvoiceschanged (avoids clobbering). */
export function runAfterSpeechPrimed(cb: () => void): void {
  if (typeof window === 'undefined') return
  const synth = window.speechSynthesis
  synth.getVoices()
  window.requestAnimationFrame(() => {
    synth.getVoices()
    cb()
  })
}

export const speak = (text: string, lang: 'en' | 'gu' = 'en', onEnd?: () => void) => {
  if (typeof window === 'undefined') return
  const trimmed = text.trim()
  if (!trimmed) {
    onEnd?.()
    return
  }

  window.speechSynthesis.resume()

  let settled = false
  const settle = () => {
    if (settled) return
    settled = true
    onEnd?.()
  }

  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(trimmed)
  utterance.rate = 0.85
  utterance.pitch = 1.0
  utterance.volume = 1.0

  if (lang === 'gu') {
    const voices = window.speechSynthesis.getVoices()
    const guVoice = voices.find((v) => v.lang === 'gu-IN')
    const hiVoice = voices.find((v) => v.lang === 'hi-IN')
    utterance.lang = guVoice ? 'gu-IN' : hiVoice ? 'hi-IN' : 'en-IN'
    if (guVoice) utterance.voice = guVoice
    else if (hiVoice) utterance.voice = hiVoice
  } else {
    utterance.lang = 'en-US'
  }

  utterance.onend = settle
  utterance.onerror = settle

  window.speechSynthesis.speak(utterance)
}

/** Starts mic capture; always invokes `onSessionClosed` when the recognition cycle ends (success, error, or timeout). */
export const startListening = (
  onResult: (transcript: string) => void,
  onError: () => void,
  onSessionClosed?: () => void
): SpeechRecoInstance | undefined => {
  if (typeof window === 'undefined') return undefined

  abortRecognition()

  const w = window as Window & {
    SpeechRecognition?: RecognitionCtor
    webkitSpeechRecognition?: RecognitionCtor
  }
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
  if (!Ctor) {
    onError()
    onSessionClosed?.()
    return undefined
  }

  const recognition = new Ctor()
  activeRecognition = recognition

  recognition.continuous = false
  recognition.interimResults = false
  recognition.lang = 'en-US'

  let closed = false
  const close = () => {
    if (closed) return
    closed = true
    if (activeRecognition === recognition) activeRecognition = null
    onSessionClosed?.()
  }

  let heard = false

  recognition.onresult = (e: { results: SpeechRecoResultList }) => {
    heard = true
    const text = e.results[0]?.[0]?.transcript ?? ''
    onResult(text)
  }

  recognition.onerror = () => {
    if (!heard) onError()
    close()
  }

  recognition.onend = () => {
    close()
  }

  try {
    recognition.start()
  } catch {
    activeRecognition = null
    onError()
    onSessionClosed?.()
    return undefined
  }

  return recognition
}

export const scorePronunciation = (expected: string, got: string): number => {
  const a = expected.toLowerCase().trim()
  const b = got.toLowerCase().trim()
  if (a === b) return 1.0
  const longer = a.length > b.length ? a : b
  const shorter = a.length > b.length ? b : a
  let matches = 0
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i]!)) matches++
  }
  return matches / longer.length
}
