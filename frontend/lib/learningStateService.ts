import { supabase } from './supabaseClient'
import { STORAGE } from './storage'
import { getBand } from './levelEngine'

export type LearningState = {
  current_level: number
  current_band: number
  last_session_id: string | null
  state_data: {
    asked_question_ids?: string[]
    streak?: number
  }
}

export async function fetchLearningState(): Promise<LearningState | null> {
  const { data, error } = await supabase
    .from('user_learning_state')
    .select('*')
    .single()
    
  if (error || !data) return null
  
  return {
    current_level: data.current_level,
    current_band: data.current_band,
    last_session_id: data.last_session_id,
    state_data: data.state_data || {}
  }
}

export function applyStateToLocal(state: LearningState) {
  if (typeof window === 'undefined') return
  
  window.localStorage.setItem(STORAGE.currentLevel, String(state.current_level))
  
  if (state.state_data.streak !== undefined) {
    window.localStorage.setItem(STORAGE.quizLiveStreak, String(state.state_data.streak))
  }
  
  if (state.last_session_id) {
    window.localStorage.setItem(STORAGE.lastSessionId, state.last_session_id)
  }
}
