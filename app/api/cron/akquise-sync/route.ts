import { NextRequest, NextResponse } from 'next/server'
import { syncAkquiseFromSheet } from '@/lib/domain/akquise-sync'

/**
 * Nächtlicher Sheet-Sync (vercel.json → crons). Vercel Cron ruft diese Route ohne
 * eigenes Secret auf ("Authorization: Bearer $CRON_SECRET" wird von Vercel selbst
 * mitgeschickt, sofern CRON_SECRET als Env-Var gesetzt ist) — dieselbe Route ist auch
 * lokal/manuell mit dem Header testbar.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET ist nicht konfiguriert.' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  try {
    const result = await syncAkquiseFromSheet()
    return NextResponse.json({ status: 'success', result })
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: error instanceof Error ? error.message : 'Sync fehlgeschlagen.' },
      { status: 500 }
    )
  }
}
