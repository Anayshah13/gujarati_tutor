import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

const GUJARI_RE = /[\u0A80-\u0AFF]/

function buildSystemPrompt(band: number, skill: string, askedIds: string[]): string {
  const askedList = askedIds.length > 0 ? askedIds.join(', ') : '(none)'
  return `You are a Gujarati language quiz generator. 
Generate ONE quiz question for a language learning app.

Band level: ${band} (1=beginner, 5=advanced)
Skill focus: ${skill}
Previously asked question IDs to avoid: ${askedList}

Band descriptions:
1: Basic greetings, single words, numbers
2: Gender, pronouns, simple sentences  
3: Postpositions, verb forms, short phrases
4: SOV structure, adjectives, sentence building
5: Complex grammar, idioms, advanced sentences

Return ONLY a valid JSON object. No markdown. No explanation. 
No text before or after. Just the raw JSON.

For MCQ questions return exactly:
{
  "id": "gen_[random 6 char alphanumeric]",
  "type": "mcq",
  "skill": "[skill name]",
  "band": [band number],
  "question": "[question in English]",
  "gujaratiText": "[relevant Gujarati script]",
  "options": ["option1", "option2", "option3", "option4"],
  "answer": "[must exactly match one of the options]",
  "answerGujarati": "[Gujarati script of answer]",
  "explanation": "[1-2 sentence explanation]",
  "pronunciationTarget": null
}

For pronunciation questions return exactly:
{
  "id": "gen_[random 6 char alphanumeric]",
  "type": "pronunciation",
  "skill": "[skill name]",
  "band": [band number],
  "question": "Say this out loud:",
  "gujaratiText": "[Gujarati text to pronounce]",
  "options": null,
  "answer": null,
  "answerGujarati": "[same Gujarati text]",
  "explanation": "[romanized pronunciation guide]",
  "pronunciationTarget": "[romanized expected pronunciation]"
}

Rules:
- Every 4th question should be pronunciation type
- Questions must be about Gujarati language learning only
- gujaratiText must always contain actual Gujarati unicode script
- answer must EXACTLY match one of the four options
- pronunciationTarget must be simple romanized English`
}

function extractJson(raw: string): string {
  let t = raw.trim()
  if (t.startsWith('\`\`\`')) {
    const match = t.match(/\`\`\`(?:json)?\s*([\s\S]*?)\`\`\`/)
    if (match?.[1]) t = match[1].trim()
  }
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) return t.slice(start, end + 1)
  return t
}

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
    const { band, skill, askedQuestionIds = [] } = body
    
    if (!band || !skill) {
       throw new Error('Missing band or skill')
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error('Missing Gemini API Key')
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${encodeURIComponent(apiKey)}`
    
    const reqBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: buildSystemPrompt(Number(band), skill, askedQuestionIds) }],
        },
      ],
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    })

    if (!res.ok) {
      throw new Error('Gemini API Error')
    }

    const payload = await res.json()
    const text = String(payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? '')
    if (!text.trim()) throw new Error('Empty response')

    const parsedJson = JSON.parse(extractJson(text))
    
    // Validate minimal fields
    if (!parsedJson.id || !parsedJson.type || !parsedJson.question || !parsedJson.gujaratiText) {
      throw new Error('Invalid JSON structure from Gemini')
    }
    
    // We could store it in the questions table here to save it for others!
    const serviceRoleClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Insert without waiting (fire and forget)
    serviceRoleClient.from('questions').insert({
      id: parsedJson.id,
      type: parsedJson.type,
      skill: parsedJson.skill,
      band: parsedJson.band,
      content: {
        question: parsedJson.question,
        gujaratiText: parsedJson.gujaratiText,
        options: parsedJson.options,
        answer: parsedJson.answer,
        answerGujarati: parsedJson.answerGujarati,
        explanation: parsedJson.explanation,
        pronunciationTarget: parsedJson.pronunciationTarget
      }
    }).then(() => {}).catch(() => {})

    return new Response(JSON.stringify({ question: parsedJson }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message === 'Unauthorized' ? 401 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
