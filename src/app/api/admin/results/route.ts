import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { calculatePoints } from '@/lib/points'
import type { Bet, Game } from '@/lib/types'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { gameId, home_score, away_score } = await req.json()

  if (!gameId || home_score == null || away_score == null) {
    return NextResponse.json({ error: 'Campos obrigatórios: gameId, home_score, away_score' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Buscar jogo para ter as odds
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()

  if (gameError || !game) {
    return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 })
  }

  // Atualizar resultado e status do jogo
  await supabase
    .from('games')
    .update({ home_score, away_score, status: 'finished' })
    .eq('id', gameId)

  // Buscar todos os palpites deste jogo
  const { data: bets } = await supabase
    .from('bets')
    .select('*')
    .eq('game_id', gameId)

  if (!bets?.length) {
    return NextResponse.json({ ok: true, updated: 0 })
  }

  // Calcular e atualizar pontos de cada palpite
  const gameWithResult: Game = { ...game, home_score, away_score }
  let updatedCount = 0

  for (const bet of bets as Bet[]) {
    const { error: updateError } = await supabase
      .from('bets')
      .update({ points_earned: calculatePoints(bet, gameWithResult) })
      .eq('id', bet.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
    updatedCount++
  }

  return NextResponse.json({ ok: true, updated: updatedCount })
}
