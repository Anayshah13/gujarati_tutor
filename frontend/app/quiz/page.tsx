'use client'

import QuestionCard from '@/components/QuestionCard'
import SpeakButton from '@/components/SpeakButton'
import Spinner from '@/components/Spinner'
import { getBand, getBandLabel, updateLevel } from '@/lib/levelEngine'
import { readNumber, STORAGE } from '@/lib/storage'
import { abortRecognition, scorePronunciation, startListening } from '@/lib/speech'
import type { QuizQuestion } from '@/types/question'
import { ensureBasicUser } from '@/lib/supabaseAuth'
import { applyStateToLocal, fetchLearningState } from '@/lib/learningStateService'
import { getNextQuestion } from '@/lib/questionService'
import { queueAnswer, flushQueue } from '@/lib/syncService'
import { supabase } from '@/lib/supabaseClient'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

type Feedback = null | 'correct' | 'wrong' | 'almost'

function liveLevel(): number {
  if (typeof window === 'undefined') return 40
  const raw = window.localStorage.getItem(STORAGE.currentLevel)
  return Math.min(100, Math.max(1, readNumber(raw, 40)))
}

function tallyBandTail(band: number, history: readonly number[]): number {
  let tail = 0
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i] === band) tail += 1
    else break
  }
  return tail
}

function LevelStrip({ level }: { level: number }) {
  const segs = 8
  const filled = Math.min(segs, Math.max(0, Math.round((level / 100) * segs)))
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-brown">
      <span className="text-ink">Level: {level}</span>
      <span className="flex gap-px font-mono tracking-tighter text-accent md:tracking-normal" aria-hidden>
        {Array.from({ length: segs }, (_, i) => (
          <span key={i} className={i < filled ? 'text-accent' : 'text-card-border'}>
            {i < filled ? '█' : '░'}
          </span>
        ))}
      </span>
    </div>
  )
}

function bumpSkill(map: Record<string, { correct: number; total: number }>, skill: string, correct: boolean) {
  const cur = map[skill] ?? { correct: 0, total: 0 }
  map[skill] = {
    correct: cur.correct + (correct ? 1 : 0),
    total: cur.total + 1,
  }
}

function weakestSkillFromStats(map: Record<string, { correct: number; total: number }>): string | null {
  const entries = Object.entries(map).filter(([, v]) => v.total > 0)
  if (!entries.length) return null
  entries.sort((a, b) => {
    const ra = a[1].correct / a[1].total
    const rb = b[1].correct / b[1].total
    if (ra !== rb) return ra - rb
    return a[0].localeCompare(b[0])
  })
  return entries[0]![0]
}

export default function QuizPage() {
  const router = useRouter()
  const reduced = useReducedMotion()

  const [level, setLevel] = useState(40)
  const [question, setQuestion] = useState<QuizQuestion | null>(null)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [transcript, setTranscript] = useState('')
  const [listening, setListening] = useState(false)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)

  const [sessionStartLevel, setSessionStartLevel] = useState<number | null>(null)
  const [totalQs, setTotalQs] = useState(0)
  const [correctQs, setCorrectQs] = useState(0)
  const [streakDisplay, setStreakDisplay] = useState(0)

  const streakRef = useRef(0)
  const longestRef = useRef(0)
  const askedIdsRef = useRef<string[]>([])
  const skillCursorRef = useRef(0)
  const bandHistoryRef = useRef<number[]>([])
  const lastFeedbackRef = useRef<Feedback>(null)
  const bootOnce = useRef(true)
  const dbSessionIdRef = useRef<number | null>(null)
  const sessionStartMsRef = useRef<number>(Date.now())
  const skillStatsRef = useRef<Record<string, { correct: number; total: number }>>({})

  useEffect(() => {
    if (typeof window === 'undefined') return
    bandHistoryRef.current = []
    askedIdsRef.current = []
    skillStatsRef.current = {}

    const boot = async () => {
      try {
        await ensureBasicUser()
        const state = await fetchLearningState()
        if (state) {
          applyStateToLocal(state)
        }
      } catch (err) {
        console.error('Boot error:', err)
      }

      const lvl = liveLevel()
      setLevel(lvl)

      const snap = window.sessionStorage.getItem(STORAGE.quizSessionStart)
      const startLS = window.localStorage.getItem(STORAGE.startLevel)
      const baseline = readNumber(snap ?? startLS, lvl)
      setSessionStartLevel(baseline)

      setStreakDisplay(readNumber(window.localStorage.getItem(STORAGE.quizLiveStreak), 0))
      streakRef.current = readNumber(window.localStorage.getItem(STORAGE.quizLiveStreak), 0)

      try {
        const { data, error } = await supabase.functions.invoke('start-session', {
          body: { startLevel: baseline }
        })
        if (!error && data?.sessionId) {
          dbSessionIdRef.current = data.sessionId
          window.localStorage.setItem('guj_ai_quiz_db_session_id', data.sessionId)
          sessionStartMsRef.current = Date.now()
        }
      } catch (e) {
        console.error('Failed to start session on edge', e)
      }
    }
    
    void boot()
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE.currentLevel, String(level))
  }, [level])

  const recordDbAnswer = useCallback((q: QuizQuestion, correct: boolean, levelBefore: number, levelAfter: number) => {
    queueAnswer({
      questionId: q.id,
      skill: q.skill,
      band: q.band,
      questionType: q.type,
      correct,
      levelBefore,
      levelAfter,
      answeredAt: new Date().toISOString()
    })
  }, [])

  const loadQuestion = useCallback(async () => {
    if (typeof window === 'undefined') return

    window.speechSynthesis.cancel()

    const lvlNow = liveLevel()
    setLevel(lvlNow)
    const band = getBand(lvlNow)

    setFeedback(null)
    setTranscript('')
    setSelectedOption(null)
    setListening(false)

    setLoading(true)
    let nextQ: QuizQuestion | null = null
    try {
      nextQ = await getNextQuestion(band, askedIdsRef.current)
    } finally {
      setLoading(false)
    }

    if (!nextQ) {
      // Very crude fallback if absolutely nothing works
      nextQ = {
        id: 'fallback_' + Date.now(),
        type: 'mcq',
        skill: 'Basics',
        band: 1,
        question: 'Offline mode active. Keep learning?',
        gujaratiText: 'હા',
        options: ['હા', 'ના', 'કદાચ', 'ખબર નહિ'],
        answer: 'હા',
        answerGujarati: 'હા',
        explanation: 'The app is offline and out of cached questions.',
        pronunciationTarget: null
      }
    }

    askedIdsRef.current.push(nextQ.id)
    bandHistoryRef.current = [...bandHistoryRef.current, band]

    setQuestion(nextQ)
  }, [])

  useEffect(() => {
    if (!bootOnce.current) return
    bootOnce.current = false
    void loadQuestion()
  }, [loadQuestion])

  function applyOutcome(outcome: 'correct' | 'wrong' | 'almost') {
    const snapshot = question
    if (!snapshot) return

    lastFeedbackRef.current = outcome

    const levelBefore = liveLevel()

    if (outcome === 'almost') {
      bumpSkill(skillStatsRef.current, snapshot.skill, false)
      recordDbAnswer(snapshot, false, levelBefore, levelBefore)
      setFeedback('almost')
      return
    }

    const correctBool = outcome === 'correct'
    bumpSkill(skillStatsRef.current, snapshot.skill, correctBool)

    setLevel((prev) => {
      const nextVal = updateLevel(prev, correctBool)
      recordDbAnswer(snapshot, correctBool, prev, nextVal)
      return nextVal
    })

    if (correctBool) {
      setCorrectQs((c) => c + 1)
      streakRef.current += 1
      longestRef.current = Math.max(longestRef.current, streakRef.current)
    } else {
      streakRef.current = 0
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE.quizLiveStreak, String(streakRef.current))
      setStreakDisplay(streakRef.current)
    }

    setTotalQs((t) => t + 1)

    if (correctBool) setFeedback('correct')
    else setFeedback('wrong')
  }

  function revealMcq(opt: string) {
    if (!question || question.type !== 'mcq' || feedback) return
    setSelectedOption(opt)
    applyOutcome(opt === question.answer ? 'correct' : 'wrong')
  }

  function submitPronunciation() {
    if (!question || question.type !== 'pronunciation' || feedback) return
    const score = scorePronunciation(question.pronunciationTarget, transcript)
    if (score > 0.75) applyOutcome('correct')
    else if (score >= 0.5) applyOutcome('almost')
    else applyOutcome('wrong')
  }

  async function advanceQuestion() {
    if (!feedback || !question || typeof window === 'undefined') return

    window.speechSynthesis.cancel()

    const lvlLive = liveLevel()
    const bumped = lastFeedbackRef.current === 'almost'
    if (bumped) setTotalQs((prev) => prev + 1)

    const projectedTotal = bumped ? totalQs + 1 : totalQs

    window.sessionStorage.setItem(
      STORAGE.quizStats,
      JSON.stringify({
        sessionStartLevel: sessionStartLevel ?? lvlLive,
        endLevelSnapshot: lvlLive,
        totalQs: projectedTotal,
        correctQs,
        streakLongest: longestRef.current,
        startBand: getBand(sessionStartLevel ?? lvlLive),
        endBand: getBand(lvlLive),
      })
    )

    void loadQuestion()
  }

  async function endSession() {
    if (typeof window === 'undefined') return
    window.speechSynthesis.cancel()
    const lvlLive = liveLevel()
    const weak = weakestSkillFromStats(skillStatsRef.current)

    // Optional: Could call an edge function for insight here
    const insight: string | null = null

    const sid = dbSessionIdRef.current
    if (sid != null) {
      const durationSeconds = Math.max(0, Math.round((Date.now() - sessionStartMsRef.current) / 1000))
      
      // Flush any remaining answers before ending
      await flushQueue()
      
      await supabase.functions.invoke('end-session', {
        body: {
          sessionId: sid,
          endLevel: lvlLive,
          durationSeconds,
          weakSkill: weak,
          insight: insight ?? '',
        }
      }).catch(() => {})
      
      window.localStorage.setItem(STORAGE.lastSessionId, String(sid))
      window.localStorage.removeItem('guj_ai_quiz_db_session_id')
    }

    window.localStorage.removeItem(STORAGE.quizLiveStreak)

    window.sessionStorage.setItem(
      STORAGE.pendingSummary,
      JSON.stringify({
        startingLevel: sessionStartLevel ?? lvlLive,
        endingLevel: lvlLive,
        totalQs,
        correctQs,
        accuracy: totalQs === 0 ? 0 : Math.round((correctQs / totalQs) * 100),
        longestStreak: longestRef.current,
      })
    )

    router.push('/summary')
  }

  const showNext = feedback !== null && !loading

  if (!question) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-surface px-6">
        <Spinner label="Spinning adaptive threads…" />
      </div>
    )
  }

  const statsLabel =
    totalQs > 0
      ? `${correctQs}/${totalQs} correct · best streak ${longestRef.current}`
      : `${longestRef.current === 0 ? 'Ignite streaks with your answers' : `Personal best streak ${longestRef.current}`}`

  return (
    <div className="relative min-h-dvh overflow-hidden bg-surface px-4 pb-12 pt-8 text-ink sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_-10%,rgba(255,179,0,0.18),transparent_54%),radial-gradient(circle_at_88%_10%,rgba(255,107,0,0.14),transparent_54%)]" />
      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-card-border bg-card p-5 shadow-card md:items-center">
          <div className="flex min-w-0 flex-1 flex-wrap items-start gap-5 md:items-center md:gap-8">
            <div className="flex items-center gap-2 rounded-full bg-cream px-3 py-2 text-sm font-bold text-accent-burnt ring-1 ring-accent-gold/60">
              <span aria-hidden>🔥</span>
              <span>{streakDisplay}</span>
            </div>
            <div className="space-y-2">
              <LevelStrip level={level} />
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-accent-gold/70 bg-cream px-3 py-1 text-xs font-semibold text-accent">
                  Band: {getBandLabel(level)}
                </span>
                <span className="text-xs text-muted">{statsLabel}</span>
              </div>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => void endSession()}
            className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:scale-105 hover:bg-accent-burnt"
          >
            End Session
          </motion.button>
        </header>

        <AnimatePresence mode="wait">
          <motion.div layout key={question.id} transition={{ duration: reduced ? 0 : 0.34 }} className="space-y-5">
            <QuestionCard
              mode="quiz"
              question={question}
              loading={loading}
              feedback={feedback}
              transcript={transcript}
              listening={listening}
              selectedOption={selectedOption}
              onMic={() => {
                abortRecognition()
                setListening(true)
                setTranscript('')
                startListening(
                  (res) => setTranscript(res.trim()),
                  () => {},
                  () => setListening(false)
                )
              }}
              onMcqPick={revealMcq}
              onPronSubmit={submitPronunciation}
            />

            {feedback && feedback !== 'almost' ? (
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-card-border bg-card p-5 text-brown shadow-card"
              >
                <p className="text-lg font-semibold text-ink">Insight</p>
                <p className="mt-2 leading-relaxed">{question.explanation}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.24em] text-accent">Answer (Gujarati)</p>
                <p className="gujarati-text mt-1 text-2xl font-semibold text-ink">{question.answerGujarati}</p>
                <div className="mt-4">
                  <SpeakButton
                    key={`${question.id}-ans`}
                    text={question.answerGujarati}
                    lang="gu"
                    label="Hear Answer"
                    size="sm"
                    autoSpeakOnce
                  />
                </div>
              </motion.div>
            ) : null}

            {feedback === 'almost' ? (
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-accent-gold/50 bg-cream p-5 shadow-card"
              >
                <p className="text-lg font-semibold text-accent-burnt">Almost — polish the cadence</p>
                <p className="mt-2 text-sm text-brown">Level deliberately frozen; carry the softness into your next cue.</p>
              </motion.div>
            ) : null}

            {showNext ? (
              <div className="flex flex-wrap justify-end gap-3">
                <Link
                  href="/"
                  className="rounded-xl border-2 border-accent px-5 py-3 text-sm font-semibold text-accent transition-all duration-200 hover:scale-105 hover:bg-cream"
                >
                  Home
                </Link>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => void advanceQuestion()}
                  className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-accent-burnt disabled:opacity-40"
                  disabled={!feedback || loading}
                >
                  Next Question
                </motion.button>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
