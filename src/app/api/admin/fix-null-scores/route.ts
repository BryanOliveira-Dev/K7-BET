import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { calculatePoints } from '@/lib/points'
import type { Game } from '@/lib/types'

export async function POST() {
  const supabase = createServerClient()

  // Corrige placares null para 0
  const { data: nullHome } = await supabase
    .from('bets')
    .update({ predicted_home_score: 0 })
    .is('predicted_home_score', null)
    .select('id')

  const { data: nullAway } = await supabase
    .from('bets')
    .update({ predicted_away_score: 0 })
    .is('predicted_away_score', null)
    .select('id')

  const nullFixed = (nullHome?.length ?? 0) + (nullAway?.length ?? 0)

  // Recalcula pontos de todos os jogos finalizados
  const { data: finishedGames, error: gamesErr } = await supabase
    .from('games')
    .select('id, home_score, away_score, home_odds, away_odds, draw_odds')
    .eq('status', 'finished')
    .not('home_score', 'is', null)

  if (gamesErr) return NextResponse.json({ error: gamesErr.message }, { status: 500 })

  let pointsUpdated = 0
  const errors: string[] = []

  for (const game of finishedGames ?? []) {
    const { data: bets, error: betsErr } = await supabase
      .from('bets')
      .select('id, predicted_result, predicted_home_score, predicted_away_score')
      .eq('game_id', game.id)

    if (betsErr) { errors.push(betsErr.message); continue }
    if (!bets?.length) continue

    for (const bet of bets) {
      const pts = calculatePoints(bet, game as Game)
      const { error: updErr } = await supabase
        .from('bets')
        .update({ points_earned: pts })
        .eq('id', bet.id)

      if (updErr) errors.push(updErr.message)
      else pointsUpdated++
    }
  }

  return NextResponse.json({
    null_scores_fixed: nullFixed,
    points_recalculated: pointsUpdated,
    finished_games: finishedGames?.length ?? 0,
    errors,
  })
}
