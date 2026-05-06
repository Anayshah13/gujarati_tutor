import { getDb } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = getDb()
    const rows = db
      .prepare(
        `SELECT s.*,
          (SELECT COUNT(*) FROM session_answers a WHERE a.session_id = s.id) AS answer_count
        FROM sessions s
        WHERE s.status = 'completed'
        ORDER BY datetime(s.created_at) DESC`
      )
      .all() as Record<string, unknown>[]

    return NextResponse.json({ sessions: rows })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load sessions'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
