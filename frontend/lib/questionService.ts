import type { QuizQuestion } from '@/types/question'
import { supabase } from './supabaseClient'

const CACHE_KEY = 'guj_ai_question_cache'

export async function fetchQuestionBatch(band: number, askedIds: string[] = []): Promise<QuizQuestion[]> {
  try {
    const { data, error } = await supabase.functions.invoke('get-next-questions', {
      body: { band, askedQuestionIds: askedIds }
    })
    
    if (error) throw error
    
    return data.questions as QuizQuestion[]
  } catch (err) {
    console.error('Failed to fetch questions from Edge Function, falling back to local storage or empty array.', err)
    return []
  }
}

export function getCachedQuestions(): QuizQuestion[] {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(CACHE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as QuizQuestion[]
  } catch {
    return []
  }
}

export function setCachedQuestions(questions: QuizQuestion[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CACHE_KEY, JSON.stringify(questions))
}

export async function getNextQuestion(band: number, askedIds: string[]): Promise<QuizQuestion | null> {
  const cached = getCachedQuestions()
  
  if (cached.length > 0) {
    const next = cached.shift()!
    setCachedQuestions(cached)
    
    // Trigger background refill if running low
    if (cached.length < 3) {
      fetchQuestionBatch(band, [...askedIds, next.id]).then(newBatch => {
        const currentCache = getCachedQuestions()
        // Deduplicate
        const existingIds = new Set(currentCache.map(q => q.id))
        const filtered = newBatch.filter(q => !existingIds.has(q.id))
        setCachedQuestions([...currentCache, ...filtered])
      })
    }
    return next
  }
  
  // Cache is empty, fetch synchronously
  const newBatch = await fetchQuestionBatch(band, askedIds)
  if (newBatch.length > 0) {
    const next = newBatch.shift()!
    setCachedQuestions(newBatch)
    return next
  }
  
  return null
}
