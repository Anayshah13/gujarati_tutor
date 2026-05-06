import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

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
    const { sessionId, endLevel, durationSeconds, weakSkill, insight } = body

    if (!sessionId) {
      throw new Error('Missing sessionId')
    }

    const { data: session } = await supabaseClient
      .from('user_sessions')
      .select('total_questions, correct_answers')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (!session) {
      throw new Error('Session not found or unauthorized')
    }

    const total = session.total_questions || 0
    const correct = session.correct_answers || 0
    const accuracy = total > 0 ? (correct / total) * 100 : 0

    await supabaseClient
      .from('user_sessions')
      .update({
        end_level: endLevel,
        duration_seconds: durationSeconds,
        weak_skill: weakSkill,
        insight: insight,
        status: 'completed',
        accuracy: accuracy
      })
      .eq('id', sessionId)
      
    // Update user learning state with last session
    await supabaseClient
      .from('user_learning_state')
      .update({ last_session_id: sessionId })
      .eq('user_id', user.id)

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message === 'Unauthorized' ? 401 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
