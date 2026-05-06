export const STORAGE = {
  startLevel: 'guj_ai_start_level',
  currentLevel: 'guj_ai_current_level',
  sessions: 'guj_ai_sessions',
  quizSessionStart: 'guj_ai_quiz_session_start',
  quizStats: 'guj_ai_quiz_stats',
  pendingSummary: 'guj_ai_pending_summary',
  /** Active SQLite session id while quiz is open */
  quizDbSessionId: 'guj_ai_quiz_db_session_id',
  /** Completed session id for summary fetch */
  lastSessionId: 'lastSessionId',
  quizLiveStreak: 'guj_ai_quiz_live_streak',
} as const

export type SessionRecord = {
  date: string
  startLevel: number
  endLevel: number
  totalQs: number
  accuracy: number
}

export function readNumber(raw: string | null, fallback: number): number {
  if (raw == null) return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}
