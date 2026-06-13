import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { calculatePoints } from '@/lib/points'

export async function POST() {
  const supabase = createServerClient()
  const errors: string[] = []

  // Buscar todos os jogos finalizados com resultado
  const { data: finishedGames, error: gamesErr } = await supabase
    .from('games')
    .select('id, home_score, away_score, home_odds, away_odds, draw_odds, status')
    .eq('status', 'finished')
    .not('home_score', 'is', null)

  if (gamesErr) return NextResponse.json({ error: gamesErr.message }, { status: 500 })
  if (!finishedGames?.length) return NextResponse.json({ message: 'Nenhum jogo finalizado encontrado.' })

  let pointsUpdated = 0

  for (const game of finishedGames) {
    const { data: bets, error: betsErr } = await supabase
      .from('bets')
      .select('id, predicted_result, predicted_home_score, predicted_away_score')
      .eq('game_id', game.id)

    if (betsErr) {
      errors.push(`Erro ao buscar bets de ${game.id}: ${betsErr.message}`)
      continue
    }
    if (!bets?.length) continue

    for (const bet of bets) {
      const pts = calculatePoints(bet, game)
      const { error: updErr } = await supabase
        .from('bets')
        .update({ points_earned: pts })
        .eq('id', bet.id)

      if (updErr) {
        errors.push(`Erro ao atualizar bet ${bet.id}: ${updErr.message}`)
      } else {
        pointsUpdated++
      }
    }
  }

  return NextResponse.json({
    finished_games: finishedGames.length,
    points_updated: pointsUpdated,
    errors,
  })
}
