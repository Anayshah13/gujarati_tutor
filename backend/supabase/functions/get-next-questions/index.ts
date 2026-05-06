import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"
import { getBand } from "../_shared/levelEngine.ts"

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

    // Get user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use service role to bypass RLS for complex queries if needed, 
    // but here we can just use the user's client to read their state.
    const { data: stateData } = await supabaseClient
      .from('user_learning_state')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const currentLevel = stateData?.current_level ?? 40
    const band = getBand(currentLevel)
    
    // We parse asked_question_ids from state_data JSON
    const stateJson = stateData?.state_data || {}
    const askedIds = Array.isArray(stateJson.asked_question_ids) ? stateJson.asked_question_ids : []

    // Fetch 10 random questions from the right band that haven't been asked
    // Supabase doesn't have a native random() without an RPC, but we can fetch a larger pool and shuffle in memory 
    // for small datasets, or just use a simple query.
    let { data: questions } = await supabaseClient
      .from('questions')
      .select('id, type, skill, band, content')
      .eq('band', band)
      
    questions = questions || []
    
    // Filter out asked
    let available = questions.filter(q => !askedIds.includes(q.id))
    
    // If we run out, just reset and use all
    if (available.length < 5) {
      available = questions
    }

    // Shuffle
    available.sort(() => 0.5 - Math.random())
    
    // Take 10
    const batch = available.slice(0, 10).map(q => {
      // Strip the exact answer from the payload so client can't cheat, 
      // but client needs answer to show after guess.
      // Wait, in an offline app, the client needs the answer to validate while offline!
      // So we must send the answer down.
      return {
        id: q.id,
        type: q.type,
        skill: q.skill,
        band: q.band,
        question: q.content.question,
        gujaratiText: q.content.gujaratiText,
        options: q.content.options,
        answer: q.content.answer, // sent for offline validation
        answerGujarati: q.content.answerGujarati,
        explanation: q.content.explanation,
        pronunciationTarget: q.content.pronunciationTarget,
        audioUrl: q.content.audioUrl
      }
    })

    return new Response(JSON.stringify({ questions: batch }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
