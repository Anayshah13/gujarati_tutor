'use client'

import ProgressBar from '@/components/ProgressBar'
import QuestionCard from '@/components/QuestionCard'
import Spinner from '@/components/Spinner'
import { PLACEMENT_QUESTIONS } from '@/data/placement'
import { getStartingLevel } from '@/lib/levelEngine'
import { STORAGE } from '@/lib/storage'
import { abortRecognition, scorePronunciation, startListening } from '@/lib/speech'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'

type Phase = 'quiz' | 'analyzing' | 'result'

export default function PlacementPage() {
  const router = useRouter()
  const reduced = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [feedback, setFeedback] = useState<null | 'correct' | 'wrong' | 'almost'>(null)
  const [transcript, setTranscript] = useState('')
  const [listening, setListening] = useState(false)
  const [phase, setPhase] = useState<Phase>('quiz')
  const [startingLevel, setStartingLevel] = useState(5)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const correctRef = useRef(0)
  const question = PLACEMENT_QUESTIONS[index]

  const total = PLACEMENT_QUESTIONS.length

  const persistLevels = useCallback((startLvl: number) => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE.startLevel, String(startLvl))
    window.localStorage.setItem(STORAGE.currentLevel, String(startLvl))
    window.sessionStorage.setItem(STORAGE.quizSessionStart, String(startLvl))
    window.sessionStorage.removeItem(STORAGE.quizStats)
    window.sessionStorage.removeItem(STORAGE.pendingSummary)
  }, [])

  const finalizePlacement = () => {
    const scoreTotal = correctRef.current
    const start = getStartingLevel(scoreTotal)
    setStartingLevel(start)
    persistLevels(start)
    setPhase('result')
  }

  const advance = () => {
    setFeedback(null)
    setTranscript('')
    setSelectedOption(null)
    const nextIdx = index + 1
    if (nextIdx >= total) {
      setPhase('analyzing')
      window.setTimeout(() => finalizePlacement(), 1500)
    } else {
      setIndex(nextIdx)
    }
  }

  const handleMcqPick = (opt: string) => {
    if (feedback) return
    if (question.type !== 'mcq') return
    setSelectedOption(opt)
    const ok = opt === question.answer
    setFeedback(ok ? 'correct' : 'wrong')
    if (ok) {
      correctRef.current += 1
    }
    window.setTimeout(() => advance(), 650)
  }

  const handleMic = () => {
    abortRecognition()
    setListening(true)
    setTranscript('')
    startListening(
      (txt) => setTranscript(txt.trim()),
      () => {},
      () => setListening(false)
    )
  }

  const handleSubmitPron = () => {
    if (feedback || question.type !== 'pronunciation') return
    const score = scorePronunciation(question.pronunciationTarget, transcript || '')
    if (score > 0.75) {
      setFeedback('correct')
      correctRef.current += 1
    } else if (score >= 0.5) {
      setFeedback('almost')
    } else {
      setFeedback('wrong')
    }
    window.setTimeout(() => advance(), 750)
  }

  const meterPct = Math.max(4, Math.min(100, (startingLevel / 100) * 100))

  return (
    <div className="relative min-h-dvh overflow-hidden bg-surface px-5 py-8 text-ink">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_-10%,rgba(255,179,0,0.18),transparent_52%),radial-gradient(circle_at_88%_10%,rgba(255,107,0,0.14),transparent_52%)]" />
      <div className="relative mx-auto max-w-3xl space-y-8">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Placement</p>
          <h1 className="text-3xl font-bold md:text-4xl">Find your Gujarati runway</h1>
        </header>

        {phase === 'quiz' ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <p className="text-sm text-brown">
                Question <span className="font-semibold text-ink">{index + 1}</span> of {total}
              </p>
              <ProgressBar label="Momentum" max={total} value={index + (feedback ? 1 : 0)} className="min-w-[160px] flex-1" />
            </div>
            <AnimatePresence mode="wait">
              <QuestionCard
                key={question.id}
                mode="placement"
                question={question}
                feedback={feedback}
                transcript={transcript}
                listening={listening}
                selectedOption={selectedOption}
                onMic={handleMic}
                onMcqPick={handleMcqPick}
                onPronSubmit={handleSubmitPron}
              />
            </AnimatePresence>
          </div>
        ) : null}

        {phase === 'analyzing' ? (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center rounded-2xl border border-card-border bg-card p-10 text-center shadow-card"
          >
            <Spinner />
            <p className="mt-5 text-xl font-semibold text-ink">Analyzing your level...</p>
            <p className="mt-3 text-brown">Sizing up syntax, stamina, and pronunciation.</p>
          </motion.div>
        ) : null}

        {phase === 'result' ? (
          <motion.section
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 rounded-2xl border border-card-border bg-card p-7 shadow-card ring-2 ring-accent-gold/25"
          >
            <header className="space-y-1">
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Calibration complete</p>
              <h2 className="text-3xl font-bold text-ink">Your starting level: {startingLevel}</h2>
            </header>
            <div className="space-y-2">
              <div className="h-6 overflow-hidden rounded-full bg-cream ring-1 ring-card-border">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${meterPct}%` }}
                  transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full bg-gradient-to-r from-accent via-accent-gold to-accent-soft"
                />
              </div>
              <div className="flex justify-between text-xs text-muted">
                <span>Level 1</span>
                <span>Adaptive ceiling · 100</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pt-4">
              <button
                type="button"
                onClick={() => router.push('/quiz')}
                className="rounded-xl bg-accent px-6 py-3 text-base font-semibold text-white shadow-md transition-all duration-200 hover:scale-105 hover:bg-accent-burnt"
              >
                Start Learning
              </button>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="rounded-xl border-2 border-accent px-6 py-3 text-base font-semibold text-accent transition-all duration-200 hover:scale-105 hover:bg-cream"
              >
                Save for later
              </button>
            </div>
          </motion.section>
        ) : null}
      </div>
    </div>
  )
}
