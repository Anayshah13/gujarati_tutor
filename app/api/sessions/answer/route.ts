import { getDb } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type Body = {
  sessionId?: unknown
  questionId?: unknown
  skill?: unknown
  band?: unknown
  questionType?: unknown
  correct?: unknown
  levelBefore?: unknown
  levelAfter?: unknown
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body
    const sessionId =
      typeof body.sessionId === 'number' && Number.isFinite(body.sessionId)
        ? body.sessionId
        : Number(body.sessionId)
    if (!Number.isFinite(sessionId)) {
      return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 })
    }
    const questionId = typeof body.questionId === 'string' ? body.questionId : ''
    const skill = typeof body.skill === 'string' ? body.skill : ''
    const band =
      typeof body.band === 'number' && Number.isFinite(body.band) ? Math.round(body.band) : 1
    const questionType = typeof body.questionType === 'string' ? body.questionType : 'mcq'
    const correct = body.correct === true || body.correct === 1 ? 1 : 0
    const levelBefore =
      typeof body.levelBefore === 'number' && Number.isFinite(body.levelBefore)
        ? Math.round(body.levelBefore)
        : 1
    const levelAfter =
      typeof body.levelAfter === 'number' && Number.isFinite(body.levelAfter)
        ? Math.round(body.levelAfter)
        : levelBefore

    const db = getDb()
    db.prepare(
      `INSERT INTO session_answers (
        session_id, question_id, skill, band, question_type, correct, level_before, level_after
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(sessionId, questionId, skill, band, questionType, correct, levelBefore, levelAfter)

    db.prepare(
      `UPDATE sessions SET 
        total_questions = total_questions + 1,
        correct_answers = correct_answers + ?
      WHERE id = ?`
    ).run(correct, sessionId)

    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to record answer'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
