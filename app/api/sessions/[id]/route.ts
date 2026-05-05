import { getDb } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, context: { params: { id: string } }) {
  try {
    const rawId = context.params.id
    const id = Number(rawId)
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    const db = getDb()
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const answers = db
      .prepare(
        'SELECT * FROM session_answers WHERE session_id = ? ORDER BY datetime(answered_at) ASC'
      )
      .all(id) as Record<string, unknown>[]

    return NextResponse.json({ session, answers })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
