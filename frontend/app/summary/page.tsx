'use client'

import Spinner from '@/components/Spinner'
import { STORAGE } from '@/lib/storage'
import { getBandLabel } from '@/lib/levelEngine'
import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import { useEffect, useState } from 'react'

type SessionRow = {
  id: number
  start_level: number
  end_level: number | null
  total_questions: number
  correct_answers: number
  accuracy: number
  duration_seconds: number
  weak_skill: string | null
  insight: string | null
  created_at: string
  status: string
}

export default function SummaryPage() {
  const reduced = useReducedMotion()
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<SessionRow | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [copiedToast, setCopiedToast] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const run = async () => {
      const rawId = window.localStorage.getItem(STORAGE.lastSessionId)
      const id = rawId ? Number(rawId) : NaN
      if (!Number.isFinite(id)) {
        setSession(null)
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`/api/sessions/${id}`)
        if (!res.ok) {
          setFetchError('Could not load session.')
          setSession(null)
          return
        }
        const data: unknown = await res.json()
        const s =
          data && typeof data === 'object' && 'session' in data
            ? (data as { session: SessionRow }).session
            : null
        setSession(s ?? null)
      } catch {
        setFetchError('Could not load session.')
        setSession(null)
      } finally {
        setLoading(false)
      }
    }

    void run()
    window.sessionStorage.removeItem(STORAGE.pendingSummary)
  }, [])

  async function shareResult() {
    if (!session?.end_level) return
    const text = `I just reached Level ${session.end_level} on Guj-Gyani! Started at ${session.start_level}. Try it at guj-gyani.vercel.app 🎯`
    try {
      await navigator.clipboard.writeText(text)
      setCopiedToast(true)
      window.setTimeout(() => setCopiedToast(false), 2000)
    } catch {
      /* noop */
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface px-6">
        <Spinner label="Loading recap…" />
      </div>
    )
  }

  if (!session || session.end_level == null) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface px-6 text-center text-brown">
        <p>{fetchError ?? 'No session captured yet.'}</p>
        <Link
          href="/quiz"
          className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:scale-105 hover:bg-accent-burnt"
        >
          Jump into Quiz
        </Link>
      </div>
    )
  }

  const totalQs = session.total_questions
  const correctQs = session.correct_answers
  const accPct = Math.round(Number(session.accuracy ?? (totalQs === 0 ? 0 : (correctQs / totalQs) * 100)))

  return (
    <div className="relative min-h-dvh overflow-hidden bg-surface px-4 py-12 text-ink sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,179,0,0.2),transparent_54%)]" />
      <div className="relative mx-auto grid max-w-4xl gap-8">
        <header className="space-y-2 text-center md:text-left">
          <p className="text-xs uppercase tracking-[0.32em] text-muted">Guj-Gyani recap</p>
          <h1 className="text-4xl font-bold md:text-[2.95rem]">Session Complete</h1>
        </header>

        {copiedToast ? (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-surface shadow-lg">
            Copied!
          </div>
        ) : null}

        <motion.section
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.45 }}
          className="rounded-2xl border border-card-border bg-card p-6 shadow-card ring-2 ring-accent-gold/20 md:p-8"
        >
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="text-center md:text-left">
              <p className="text-sm text-brown">Starting level</p>
              <p className="text-6xl font-bold tabular-nums">{session.start_level}</p>
            </div>
            <motion.div
              aria-hidden
              initial={false}
              animate={{ x: [-4, 0, -6, 0] }}
              transition={{ repeat: Infinity, duration: reduced ? 0 : 3.8, ease: 'easeInOut' }}
              className="rotate-[-8deg] text-5xl text-accent"
            >
              ↗︎
            </motion.div>
            <div className="text-center md:text-right">
              <p className="text-sm text-brown">Ending level</p>
              <p className="text-6xl font-bold tabular-nums text-success">{session.end_level}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 rounded-2xl border border-card-border bg-cream/50 p-5 text-sm text-brown md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Questions answered</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{totalQs}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Accuracy</p>
              <p className="mt-2 text-3xl font-semibold text-accent">{accPct}%</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Duration</p>
              <p className="mt-2 text-3xl font-semibold text-accent-soft">
                {Math.round(session.duration_seconds)}s
              </p>
            </div>
          </div>

          {session.insight ? (
            <div className="mt-6 rounded-2xl border border-accent-gold/40 bg-cream/70 px-4 py-4 text-sm leading-relaxed text-brown">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Insight</p>
              <p className="mt-2 text-base text-ink">{session.insight}</p>
            </div>
          ) : null}

          {session.weak_skill ? (
            <p className="mt-4 rounded-2xl border border-card-border bg-cream/60 px-4 py-3 text-sm text-brown">
              Focus next: <span className="font-semibold text-accent-burnt">{session.weak_skill}</span>
            </p>
          ) : null}

          {getBandLabel(session.start_level) !== getBandLabel(session.end_level) ? (
            <p className="mt-6 rounded-2xl bg-cream px-4 py-3 text-sm text-accent-burnt">
              Band progression: {getBandLabel(session.start_level)} → {getBandLabel(session.end_level)}.
            </p>
          ) : (
            <p className="mt-6 rounded-2xl border border-card-border bg-surface px-4 py-3 text-sm text-brown">
              Stayed within {getBandLabel(session.start_level)} — tight loops still sharpen intuition.
            </p>
          )}

          <div className="mt-10 flex flex-wrap justify-center gap-4 md:justify-start">
            <button
              type="button"
              onClick={() => void shareResult()}
              className="rounded-xl border-2 border-accent px-6 py-3 text-base font-semibold text-accent transition-all duration-200 hover:scale-105 hover:bg-cream"
            >
              Share Result
            </button>
            <Link
              href="/placement"
              className="rounded-xl bg-accent px-6 py-3 text-base font-semibold text-white shadow-md transition-all duration-200 hover:scale-105 hover:bg-accent-burnt"
            >
              Play Again
            </Link>
            <Link
              href="/admin"
              className="rounded-xl border-2 border-accent px-6 py-3 text-base font-semibold text-accent transition-all duration-200 hover:scale-105 hover:bg-cream"
            >
              View Progress
            </Link>
          </div>
        </motion.section>
      </div>
    </div>
  )
}
