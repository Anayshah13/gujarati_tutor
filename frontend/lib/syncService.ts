import { supabase } from './supabaseClient'

const OUTBOX_KEY = 'guj_ai_sync_outbox'

export type AnswerPayload = {
  questionId: string
  skill: string
  band: number
  questionType: string
  correct: boolean
  levelBefore: number
  levelAfter: number
  answerData?: any
  answeredAt: string
}

export function queueAnswer(answer: AnswerPayload) {
  if (typeof window === 'undefined') return
  const current = getOutbox()
  current.push(answer)
  window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(current))
  
  // Attempt flush if online
  if (navigator.onLine) {
    flushQueue()
  }
}

export function getOutbox(): AnswerPayload[] {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(OUTBOX_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as AnswerPayload[]
  } catch {
    return []
  }
}

export async function flushQueue() {
  if (typeof window === 'undefined') return
  const queue = getOutbox()
  if (queue.length === 0) return
  
  // We need to know the active session ID.
  // We can fetch it from localStorage where we keep it.
  const sessionId = window.localStorage.getItem('guj_ai_quiz_db_session_id')
  if (!sessionId) return // Can't sync answers without a session

  try {
    const { error } = await supabase.functions.invoke('sync-progress', {
      body: {
        sessionId,
        answers: queue
      }
    })
    
    if (error) throw error
    
    // Success, clear queue
    window.localStorage.setItem(OUTBOX_KEY, JSON.stringify([]))
  } catch (err) {
    console.error('Failed to sync queue', err)
    // Keep in queue for next time
  }
}

// Auto-flush on reconnect
if (typeof window !== 'undefined') {
  window.addEventListener('online', flushQueue)
}
