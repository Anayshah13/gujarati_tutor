import { pickRandomBandQuestion } from '@/data/questions'
import type { Band, McqQuestion, PronunciationQuestion, QuizQuestion } from '@/types/question'

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
  if (t.startsWith('```')) {
    const match = t.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match?.[1]) t = match[1].trim()
  }
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) return t.slice(start, end + 1)
  return t
}

function isBand(n: unknown): n is Band {
  return typeof n === 'number' && n >= 1 && n <= 5 && Number.isInteger(n)
}

function validateMcq(obj: Record<string, unknown>): obj is Omit<McqQuestion, 'id'> & { id: string } {
  const pt = obj.pronunciationTarget
  return (
    obj.type === 'mcq' &&
    typeof obj.id === 'string' &&
    typeof obj.skill === 'string' &&
    isBand(obj.band) &&
    typeof obj.question === 'string' &&
    typeof obj.gujaratiText === 'string' &&
    GUJARI_RE.test(String(obj.gujaratiText)) &&
    Array.isArray(obj.options) &&
    obj.options.length === 4 &&
    obj.options.every((x) => typeof x === 'string') &&
    typeof obj.answer === 'string' &&
    typeof obj.answerGujarati === 'string' &&
    typeof obj.explanation === 'string' &&
    (pt === null || pt === undefined) &&
    (obj.options as string[]).includes(obj.answer as string)
  )
}

function validatePronunciation(
  obj: Record<string, unknown>
): obj is Omit<PronunciationQuestion, 'id'> & { id: string } {
  const opts = obj.options
  const ans = obj.answer
  return (
    obj.type === 'pronunciation' &&
    typeof obj.id === 'string' &&
    typeof obj.skill === 'string' &&
    isBand(obj.band) &&
    typeof obj.question === 'string' &&
    typeof obj.gujaratiText === 'string' &&
    GUJARI_RE.test(String(obj.gujaratiText)) &&
    (opts === null || opts === undefined) &&
    (ans === null || ans === undefined) &&
    typeof obj.answerGujarati === 'string' &&
    typeof obj.explanation === 'string' &&
    typeof obj.pronunciationTarget === 'string' &&
    obj.pronunciationTarget.trim().length > 0
  )
}

export async function generateQuestion(
  band: number,
  skill: string,
  askedQuestionIds: string[]
): Promise<QuizQuestion> {
  const b = band as Band
  const fallback = (): QuizQuestion =>
    pickRandomBandQuestion(Number.isFinite(band) ? band : 1, new Set(askedQuestionIds))

  const apiKey =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_GEMINI_API_KEY : undefined
  if (!apiKey || apiKey === 'your_key_here') {
    return fallback()
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${encodeURIComponent(
      apiKey
    )}`
    const body = {
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
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      return fallback()
    }

    const payload = await res.json()
    const text = String(payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? '')
    if (!text.trim()) return fallback()

    let parsedUnknown: unknown
    try {
      parsedUnknown = JSON.parse(extractJson(text))
    } catch {
      return fallback()
    }

    const obj =
      parsedUnknown && typeof parsedUnknown === 'object' ? (parsedUnknown as Record<string, unknown>) : null
    if (!obj) return fallback()

    const safeBand =
      typeof band === 'number' && band >= 1 && band <= 5 ? band : 1
    obj.band = safeBand

    const bandNum = typeof obj.band === 'number' ? obj.band : Number(obj.band)

    if (validateMcq(obj)) {
      const q: McqQuestion = {
        id: String(obj.id),
        type: 'mcq',
        skill: obj.skill,
        band: bandNum as Band,
        question: obj.question,
        gujaratiText: obj.gujaratiText,
        options: [obj.options[0]!, obj.options[1]!, obj.options[2]!, obj.options[3]!],
        answer: obj.answer,
        answerGujarati: obj.answerGujarati,
        explanation: obj.explanation,
        pronunciationTarget: null,
      }
      if (!askedQuestionIds.includes(q.id)) return q
      return fallback()
    }

    if (validatePronunciation(obj)) {
      const q: PronunciationQuestion = {
        id: String(obj.id),
        type: 'pronunciation',
        skill: obj.skill,
        band: bandNum as Band,
        question: obj.question,
        gujaratiText: obj.gujaratiText,
        options: null,
        answer: null,
        answerGujarati: obj.answerGujarati,
        explanation: obj.explanation,
        pronunciationTarget: obj.pronunciationTarget,
      }
      if (!askedQuestionIds.includes(q.id)) return q
      return fallback()
    }
  } catch {
    /* fall through */
  }

  return fallback()
}

export const SKILLS_BY_BAND: Record<number, readonly string[]> = {
  1: ['Greetings', 'Numbers', 'Basics', 'Farewells'],
  2: ['Gender', 'Pronouns', 'Nouns', 'Simple sentences'],
  3: ['Postpositions', 'Verbs', 'Tense', 'Short phrases'],
  4: ['SOV syntax', 'Adjectives', 'Translation', 'Agreement'],
  5: ['Idioms', 'Advanced grammar', 'Reading', 'Composition'],
}

export function rotateSkill(band: number, index: number): string {
  const list = SKILLS_BY_BAND[band] ?? SKILLS_BY_BAND[1]!
  return list[index % list.length] ?? 'Greetings'
}

export async function generateSessionInsight(params: {
  startLevel: number
  endLevel: number
  totalQs: number
  correctQs: number
  weakSkill: string | null
}): Promise<string> {
  const fallback =
    'સારું કામ! દરરોજ થોડી નિયમિત સરાહણ રાખો અને નવા વાક્યો બોલવાનો પ્રયાસ કરો.'
  const apiKey =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_GEMINI_API_KEY : undefined
  if (!apiKey || apiKey === 'your_key_here') {
    return fallback
  }

  const weak = params.weakSkill ?? 'general practice'
  const prompt = `You are a supportive Gujarati language tutor. In exactly 2 short sentences (English), congratulate the learner and give one actionable tip. They practiced from adaptive level ${params.startLevel} to ${params.endLevel}, answered ${params.totalQs} questions with ${params.correctQs} correct. Their weakest skill tag was: ${weak}. Be warm and concise.`

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${encodeURIComponent(
      apiKey
    )}`
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return fallback
    const payload: unknown = await res.json()
    const text = String(
      (payload as { candidates?: { content?: { parts?: { text?: string }[] } }[] })?.candidates?.[0]
        ?.content?.parts?.[0]?.text ?? ''
    ).trim()
    return text || fallback
  } catch {
    return fallback
  }
}
