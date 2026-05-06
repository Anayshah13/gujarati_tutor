'use client'

import Spinner from '@/components/Spinner'
import { STORAGE } from '@/lib/storage'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'

import { supabase } from '@/lib/supabaseClient'

type SessionListRow = {
  id: string
  created_at: string
  start_level: number
  end_level: number | null
  total_questions: number
  correct_answers: number
  accuracy: number
  duration_seconds: number
  answer_count?: number
}

type AnswerRow = {
  id: string
  session_id: string
  question_id: string
  skill: string
  band: number
  question_type: string
  correct: number
  level_before: number
  level_after: number
  answered_at: string
}

export default function AdminPage() {
  const reduced = useReducedMotion()
  const [sessions, setSessions] = useState<SessionListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detailAnswers, setDetailAnswers] = useState<Record<string, AnswerRow[]>>({})
  const [detailLoading, setDetailLoading] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { data, error } = await supabase
          .from('user_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error

        if (!cancelled) setSessions((data || []) as SessionListRow[])
      } catch {
        if (!cancelled) {
          setFetchError('Could not load sessions.')
          setSessions([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const chartData = useMemo(
    () =>
      [...sessions]
        .reverse()
        .map((session, idx) => ({
          idx: idx + 1,
          label: new Date(session.created_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          }),
          level: session.end_level ?? 0,
        })),
    [sessions]
  )

  const clearAll = useCallback(() => {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(STORAGE.sessions)
    window.localStorage.removeItem(STORAGE.currentLevel)
    window.localStorage.removeItem(STORAGE.startLevel)
    window.sessionStorage.removeItem(STORAGE.quizStats)
    window.sessionStorage.removeItem(STORAGE.quizSessionStart)
    window.sessionStorage.removeItem(STORAGE.pendingSummary)
    window.localStorage.removeItem(STORAGE.quizDbSessionId)
    window.localStorage.removeItem(STORAGE.lastSessionId)
    window.localStorage.removeItem(STORAGE.quizLiveStreak)
  }, [])

  async function toggleRow(id: string) {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    if (detailAnswers[id]) return
    setDetailLoading(id)
    try {
      const { data, error } = await supabase
        .from('session_answers')
        .select('*')
        .eq('session_id', id)
        .order('answered_at', { ascending: true })

      if (error) throw error

      setDetailAnswers((prev) => ({ ...prev, [id]: (data || []) as AnswerRow[] }))
    } catch {
      setDetailAnswers((prev) => ({ ...prev, [id]: [] }))
    } finally {
      setDetailLoading(null)
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-surface px-4 py-10 text-ink sm:px-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,179,0,0.22),transparent_60%)] opacity-90" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.32em] text-muted">Guj-Gyani intelligence</p>
            <h1 className="text-3xl font-bold md:text-4xl">Progress console</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-xl border-2 border-accent px-4 py-2 text-sm font-semibold text-accent transition-all duration-200 hover:scale-105 hover:bg-cream"
            >
              Home
            </Link>
            <button
              type="button"
              onClick={clearAll}
              className="rounded-xl border border-error bg-error px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:scale-105 hover:bg-error/90"
            >
              Clear local data
            </button>
          </div>
        </header>

        <motion.section
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.45 }}
          className="rounded-2xl border border-card-border bg-card p-5 shadow-card md:p-7"
          style={{ minHeight: 320 }}
        >
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-ink">Ending level trajectory</h2>
            <p className="text-xs text-muted">Completed sessions (SQLite)</p>
          </div>
          {loading ? (
            <Spinner />
          ) : sessions.length === 0 ? (
            <p className="text-sm text-brown">{fetchError ?? 'No sessions archived yet.'}</p>
          ) : (
            <div style={{ height: 300 }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke="rgba(93,58,26,0.12)" strokeDasharray="4 12" vertical={false} />
                  <XAxis dataKey="label" stroke="#8D6E63" />
                  <YAxis domain={[0, 110]} stroke="#8D6E63" />
                  <Tooltip
                    cursor={{ stroke: 'rgba(255,107,0,0.35)' }}
                    contentStyle={{
                      borderRadius: 16,
                      border: '1px solid #F5E6D0',
                      background: '#FFFFFF',
                      color: '#1A0A00',
                      boxShadow: '0 16px 40px rgba(26,10,0,0.12)',
                    }}
                  />
                  <Legend wrapperStyle={{ color: '#5D3A1A' }} />
                  <Line
                    dot={{ r: 3, fill: '#FF6B00' }}
                    type="monotone"
                    dataKey="level"
                    stroke="#FF6B00"
                    strokeWidth={3}
                    name="End level"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.section>

        <motion.section
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : 0.06, duration: reduced ? 0 : 0.45 }}
          className="rounded-2xl border border-card-border bg-card p-4 shadow-card md:p-6"
        >
          <div className="mb-5 flex flex-wrap items-center gap-4">
            <h2 className="text-lg font-bold text-ink">Session ledger</h2>
            <p className="text-xs uppercase tracking-[0.24em] text-muted">{sessions.length} entries</p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-card-border bg-surface/80">
            <table className="min-w-[840px] w-full divide-y divide-card-border text-sm">
              <thead className="bg-cream/90">
                <tr className="text-left text-brown">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Start</th>
                  <th className="px-4 py-3 font-semibold">End</th>
                  <th className="px-4 py-3 font-semibold">Questions</th>
                  <th className="px-4 py-3 font-semibold">Answers logged</th>
                  <th className="px-4 py-3 font-semibold">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border bg-card">
                {!loading && sessions.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-brown" colSpan={6}>
                      Nothing logged yet — complete a quiz session first.
                    </td>
                  </tr>
                ) : (
                  sessions.map((row) => (
                    <Fragment key={row.id}>
                      <tr
                        role="button"
                        tabIndex={0}
                        onClick={() => void toggleRow(row.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            void toggleRow(row.id)
                          }
                        }}
                        className="cursor-pointer hover:bg-cream/40"
                      >
                        <td className="px-4 py-3 text-muted">
                          {new Date(row.created_at).toLocaleString(undefined, {
                            weekday: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3 font-semibold text-ink">{row.start_level}</td>
                        <td className="px-4 py-3 font-semibold text-success">{row.end_level ?? '—'}</td>
                        <td className="px-4 py-3 text-accent">{row.total_questions}</td>
                        <td className="px-4 py-3 text-brown">{row.answer_count ?? '—'}</td>
                        <td className="px-4 py-3 text-ink">{Math.round(row.accuracy)}%</td>
                      </tr>
                      {expandedId === row.id ? (
                        <tr key={`${row.id}-detail`} className="bg-cream/50">
                          <td colSpan={6} className="px-4 py-4">
                            {detailLoading === row.id ? (
                              <Spinner />
                            ) : (
                              <div className="overflow-x-auto rounded-xl border border-card-border bg-card">
                                <table className="min-w-[720px] w-full text-xs md:text-sm">
                                  <thead className="bg-cream text-brown">
                                    <tr className="text-left">
                                      <th className="px-3 py-2 font-semibold">Question ID</th>
                                      <th className="px-3 py-2 font-semibold">Skill</th>
                                      <th className="px-3 py-2 font-semibold">Band</th>
                                      <th className="px-3 py-2 font-semibold">Correct</th>
                                      <th className="px-3 py-2 font-semibold">Level Before</th>
                                      <th className="px-3 py-2 font-semibold">Level After</th>
                                      <th className="px-3 py-2 font-semibold">Time</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-card-border">
                                    {(detailAnswers[row.id] ?? []).map((a) => (
                                      <tr key={a.id}>
                                        <td className="px-3 py-2 font-mono text-xs text-ink">{a.question_id}</td>
                                        <td className="px-3 py-2 text-brown">{a.skill}</td>
                                        <td className="px-3 py-2">{a.band}</td>
                                        <td className="px-3 py-2">{a.correct ? 'Yes' : 'No'}</td>
                                        <td className="px-3 py-2">{a.level_before}</td>
                                        <td className="px-3 py-2">{a.level_after}</td>
                                        <td className="px-3 py-2 text-muted">
                                          {new Date(a.answered_at).toLocaleTimeString(undefined, {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit',
                                          })}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.section>
      </div>
    </div>
  )
}
