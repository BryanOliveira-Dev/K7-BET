import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { calculatePoints } from '@/lib/points'

export async function GET() {
  const supabase = createServerClient()

  // Todos os jogos
  const { data: allGames, error: gamesErr } = await supabase
    .from('games')
    .select('id, api_id, home_team, away_team, status, home_score, away_score, home_odds, away_odds, draw_odds')

  // Todos os palpites com nome do usuário e horário
  const { data: allBets, error: betsErr } = await supabase
    .from('bets')
    .select('id, user_id, game_id, predicted_result, predicted_home_score, predicted_away_score, points_earned, created_at, users(name)')
    .order('created_at', { ascending: true })

  if (gamesErr || betsErr) {
    return NextResponse.json({ gamesErr: gamesErr?.message, betsErr: betsErr?.message }, { status: 500 })
  }

  const gameIds = new Set((allGames ?? []).map(g => g.id))
  const orphanBetGameIds = [...new Set((allBets ?? []).filter(b => !gameIds.has(b.game_id)).map(b => b.game_id))]

  const finishedGames = (allGames ?? []).filter(g => g.status === 'finished' && g.home_score != null)

  // Simular cálculo de pontos
  const simulatedPoints: Record<string, { bet_id: string; current: number; would_be: number }[]> = {}
  for (const game of finishedGames) {
    const gameBets = (allBets ?? []).filter(b => b.game_id === game.id)
    simulatedPoints[game.id] = gameBets.map((bet) => ({
      bet_id: bet.id,
      current: bet.points_earned,
      would_be: calculatePoints(bet, game),
    }))
  }

  const betsLog = (allBets ?? []).map(b => ({
    user: (b.users as unknown as { name: string } | null)?.name ?? b.user_id,
    bet: `${b.predicted_result} ${b.predicted_home_score ?? '?'}×${b.predicted_away_score ?? '?'}`,
    points: b.points_earned,
    game_id: b.game_id,
    when: new Date(b.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
  }))

  return NextResponse.json({
    total_games: (allGames ?? []).length,
    finished_games: finishedGames,
    total_bets: (allBets ?? []).length,
    orphan_bet_game_ids: orphanBetGameIds,
    bets_log: betsLog,
    points_simulation: simulatedPoints,
  })
}
