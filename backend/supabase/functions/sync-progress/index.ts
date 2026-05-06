import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"
import { updateLevel, scorePronunciation, getBand } from "../_shared/levelEngine.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')

    const body = await req.json()
    const { sessionId, answers } = body

    if (!sessionId || !Array.isArray(answers)) {
      throw new Error('Invalid payload')
    }

    // We will need to use service_role to insert into tables that might be restricted or complex
    // Actually, user is authenticated, so RLS works.
    
    // Process answers
    let correctCount = 0
    const askedIds = []
    
    for (const ans of answers) {
      askedIds.push(ans.questionId)
      if (ans.correct) correctCount++
      
      await supabaseClient.from('session_answers').insert({
        session_id: sessionId,
        question_id: ans.questionId,
        skill: ans.skill,
        band: ans.band,
        question_type: ans.questionType,
        correct: ans.correct,
        level_before: ans.levelBefore,
        level_after: ans.levelAfter,
        answer_data: ans.answerData || {},
        answered_at: ans.answeredAt || new Date().toISOString()
      })
    }

    // Update session
    if (answers.length > 0) {
      // Need service role or simple query to increment. We can fetch then update.
      const { data: session } = await supabaseClient
        .from('user_sessions')
        .select('total_questions, correct_answers')
        .eq('id', sessionId)
        .single()
        
      if (session) {
        await supabaseClient.from('user_sessions').update({
          total_questions: session.total_questions + answers.length,
          correct_answers: session.correct_answers + correctCount
        }).eq('id', sessionId)
      }
    }

    // Update learning state
    const { data: stateData } = await supabaseClient
      .from('user_learning_state')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const stateJson = stateData?.state_data || {}
    const existingAsked = Array.isArray(stateJson.asked_question_ids) ? stateJson.asked_question_ids : []
    const newAsked = [...new Set([...existingAsked, ...askedIds])]

    // If answers provided, the last answer determines the new level
    let newLevel = stateData?.current_level ?? 40
    if (answers.length > 0) {
      newLevel = answers[answers.length - 1].levelAfter
    }

    await supabaseClient.from('user_learning_state').upsert({
      user_id: user.id,
      current_level: newLevel,
      current_band: getBand(newLevel),
      last_session_id: sessionId,
      state_data: {
        ...stateJson,
        asked_question_ids: newAsked
      },
      updated_at: new Date().toISOString()
    })

    return new Response(JSON.stringify({ ok: true, syncedCount: answers.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message === 'Unauthorized' ? 401 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
