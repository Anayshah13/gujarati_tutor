import { getDb } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type Body = {
  sessionId?: unknown
  endLevel?: unknown
  durationSeconds?: unknown
  weakSkill?: unknown
  insight?: unknown
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
    const endLevel =
      typeof body.endLevel === 'number' && Number.isFinite(body.endLevel)
        ? Math.round(body.endLevel)
        : 1
    const durationSeconds =
      typeof body.durationSeconds === 'number' && Number.isFinite(body.durationSeconds)
        ? Math.max(0, Math.round(body.durationSeconds))
        : 0
    const weakSkill =
      typeof body.weakSkill === 'string' && body.weakSkill.trim()
        ? body.weakSkill.trim()
        : null
    const insight = typeof body.insight === 'string' ? body.insight : null

    const db = getDb()
    const row = db
      .prepare(
        'SELECT total_questions, correct_answers FROM sessions WHERE id = ?'
      )
      .get(sessionId) as { total_questions: number; correct_answers: number } | undefined

    const total = row?.total_questions ?? 0
    const correct = row?.correct_answers ?? 0
    const accuracy = total > 0 ? (correct / total) * 100 : 0

    db.prepare(
      `UPDATE sessions SET
        end_level = ?,
        duration_seconds = ?,
        status = 'completed',
        weak_skill = ?,
        insight = ?,
        accuracy = ?
      WHERE id = ?`
    ).run(endLevel, durationSeconds, weakSkill, insight, accuracy, sessionId)

    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to end session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
