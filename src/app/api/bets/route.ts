import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { gameId, predicted_result, predicted_home_score, predicted_away_score } = await req.json()

  if (!gameId || !predicted_result) {
    return NextResponse.json({ error: 'gameId e predicted_result são obrigatórios' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Verificar se o jogo ainda aceita palpites (10min antes do kickoff)
  const { data: game } = await supabase
    .from('games')
    .select('kickoff_at, status')
    .eq('id', gameId)
    .single()

  if (!game) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 })

  const cutoff = new Date(game.kickoff_at).getTime() - 10 * 60 * 1000
  if (Date.now() >= cutoff || game.status !== 'scheduled') {
    return NextResponse.json({ error: 'Palpites encerrados para este jogo' }, { status: 400 })
  }

  const { error } = await supabase.from('bets').upsert(
    {
      user_id: session.userId,
      game_id: gameId,
      predicted_result,
      predicted_home_score: predicted_home_score ?? null,
      predicted_away_score: predicted_away_score ?? null,
    },
    { onConflict: 'user_id,game_id' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('bets')
    .select('*')
    .eq('user_id', session.userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
