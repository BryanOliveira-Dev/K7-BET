import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { fetchFinishedResults } from '@/lib/football-api'

export async function GET() {
  const supabase = createServerClient()

  // Palpites no banco
  const { data: bets } = await supabase
    .from('bets')
    .select('id, user_id, game_id, predicted_result, points_earned')
    .limit(20)

  // Jogos referenciados pelas apostas
  const betGameIds = [...new Set((bets ?? []).map((b: { game_id: string }) => b.game_id))]
  const { data: betGames } = await supabase
    .from('games')
    .select('id, api_id, home_team, away_team, status, home_score, away_score, kickoff_at')
    .in('id', betGameIds)

  // Total de jogos e primeiros 5
  const { data: games, count: totalGames } = await supabase
    .from('games')
    .select('id, api_id, home_team, away_team, status, home_score, away_score, kickoff_at', { count: 'exact' })
    .order('kickoff_at', { ascending: true })
    .limit(5)

  // Usuários
  const { data: users } = await supabase
    .from('users')
    .select('id, name')

  // O que a API retorna
  let apiResults: unknown = null
  let apiError: string | null = null
  try {
    apiResults = await fetchFinishedResults()
  } catch (e) {
    apiError = String(e)
  }

  return NextResponse.json({
    total_games_in_db: totalGames,
    earliest_5_games: games,
    games_that_have_bets: betGames,
    bets_summary: (bets ?? []).length,
    users_in_db: users,
    api_finished_results: apiResults,
    api_error: apiError,
  })
}
