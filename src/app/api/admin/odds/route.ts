import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { gameId, home_odds, away_odds, draw_odds } = await req.json()

  if (!gameId) {
    return NextResponse.json({ error: 'gameId obrigatório' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { error } = await supabase
    .from('games')
    .update({ home_odds, away_odds, draw_odds })
    .eq('id', gameId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
