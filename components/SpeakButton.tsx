'use client'

import { runAfterSpeechPrimed, speak } from '@/lib/speech'
import { motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'

type Phase = 'idle' | 'speaking' | 'done'

const sizeClass: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'gap-1.5 px-3 py-2 text-sm',
  md: 'gap-2 px-4 py-3 text-base',
  lg: 'gap-2 px-5 py-4 text-lg',
}

type Props = {
  text: string
  gujaratiText?: string
  lang?: 'en' | 'gu'
  /** After Gujarati audio, speak this in English (e.g. romanization). */
  romanAfterGu?: string
  size?: 'sm' | 'md' | 'lg'
  label?: string
  /** Fire speak once on mount (e.g. answer reveal) */
  autoSpeakOnce?: boolean
}

export default function SpeakButton({
  text,
  gujaratiText,
  lang = 'en',
  romanAfterGu,
  size = 'md',
  label,
  autoSpeakOnce = false,
}: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const autoFired = useRef(false)
  const phaseResetTimer = useRef<number | null>(null)
  const safetyTimerRef = useRef<number | null>(null)

  const runSpeak = useCallback(() => {
    if (typeof window === 'undefined') return

    if (phaseResetTimer.current != null) {
      clearTimeout(phaseResetTimer.current)
      phaseResetTimer.current = null
    }
    if (safetyTimerRef.current != null) {
      clearTimeout(safetyTimerRef.current)
      safetyTimerRef.current = null
    }

    try {
      setPhase('speaking')

      const finish = () => {
        if (safetyTimerRef.current != null) {
          clearTimeout(safetyTimerRef.current)
          safetyTimerRef.current = null
        }
        setPhase('done')
        phaseResetTimer.current = window.setTimeout(() => setPhase('idle'), 2000) as unknown as number
      }

      const speakPipeline = () => {
        if (gujaratiText?.trim() && lang === 'en') {
          speak(text, 'en', () => speak(gujaratiText.trim(), 'gu', finish))
          return
        }
        if (lang === 'gu') {
          const roman = romanAfterGu?.trim()
          speak(text, 'gu', () => {
            if (roman) speak(roman, 'en', finish)
            else finish()
          })
          return
        }
        speak(text, lang, finish)
      }

      runAfterSpeechPrimed(() => {
        speakPipeline()
      })

      safetyTimerRef.current = window.setTimeout(() => {
        safetyTimerRef.current = null
        setPhase((p) => (p === 'speaking' ? 'idle' : p))
      }, 45000) as unknown as number
    } catch {
      setPhase('idle')
    }
  }, [text, gujaratiText, lang, romanAfterGu])

  useEffect(() => {
    return () => {
      if (phaseResetTimer.current) clearTimeout(phaseResetTimer.current)
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!autoSpeakOnce || autoFired.current || !text.trim()) return
    autoFired.current = true
    runSpeak()
  }, [autoSpeakOnce, text, runSpeak])

  const idle =
    'border border-accent-gold bg-cream text-accent shadow-sm hover:bg-cream hover:brightness-[0.98]'
  const speaking = 'relative border border-accent bg-accent text-white shadow-md'
  const doneCls = 'border border-success/50 bg-success/15 text-success'

  return (
    <motion.button
      type="button"
      aria-label={label ?? 'Speak aloud'}
      whileHover={autoSpeakOnce ? undefined : { scale: 1.05 }}
      whileTap={autoSpeakOnce ? undefined : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      onClick={() => {
        if (!autoSpeakOnce) runSpeak()
      }}
      disabled={autoSpeakOnce}
      className={`relative inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 ${sizeClass[size]} ${
        phase === 'speaking' ? speaking : phase === 'done' ? doneCls : idle
      } ${autoSpeakOnce ? 'cursor-default' : ''}`}
    >
      {phase === 'speaking' ? (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-[-4px] rounded-full border-2 border-accent-gold"
          animate={{ scale: [1, 1.12, 1], opacity: [0.85, 0.35, 0.85] }}
          transition={{ repeat: Infinity, duration: 1.25, ease: 'easeInOut' }}
        />
      ) : null}
      <span aria-hidden className="relative z-[1]">
        {phase === 'idle' ? '🔊' : phase === 'speaking' ? '🔊' : '✓'}
      </span>
      {label ? <span className="relative z-[1]">{label}</span> : null}
    </motion.button>
  )
}
