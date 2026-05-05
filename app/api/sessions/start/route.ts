import { getDb } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { startLevel?: unknown }
    const startLevel =
      typeof body.startLevel === 'number' && Number.isFinite(body.startLevel)
        ? Math.round(body.startLevel)
        : 40
    const db = getDb()
    const result = db
      .prepare('INSERT INTO sessions (start_level, status) VALUES (?, ?)')
      .run(startLevel, 'active')
    return NextResponse.json({ sessionId: Number(result.lastInsertRowid) })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to start session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
