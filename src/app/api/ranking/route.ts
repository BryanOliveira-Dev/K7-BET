import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { fetchFinishedResults } from '@/lib/football-api'
import { calculatePoints } from '@/lib/points'
import type { Game } from '@/lib/types'

async function syncFinishedGames() {
  const supabase = createServerClient()

  let finishedResults
  try {
    finishedResults = await fetchFinishedResults()
  } catch {
    return
  }

  if (!finishedResults.length) return

  const apiIds = finishedResults.map(r => r.api_id)
  const { data: games } = await supabase
    .from('games')
    .select('*')
    .in('api_id', apiIds)
    .neq('status', 'finished')

  if (!games?.length) return

  const resultsByApiId = Object.fromEntries(finishedResults.map(r => [r.api_id, r]))

  for (const game of games) {
    const result = resultsByApiId[game.api_id]
    if (!result) continue

    const { home_score, away_score } = result

    await supabase
      .from('games')
      .update({ home_score, away_score, status: 'finished' })
      .eq('id', game.id)

    const { data: bets } = await supabase
      .from('bets')
      .select('*')
      .eq('game_id', game.id)

    if (!bets?.length) continue

    const gameWithResult: Game = { ...game, home_score, away_score }

    for (const bet of bets) {
      await supabase
        .from('bets')
        .update({ points_earned: calculatePoints(bet, gameWithResult) })
        .eq('id', bet.id)
    }
  }
}

export async function GET() {
  const supabase = createServerClient()

  // Auto-sincroniza resultados antes de retornar o ranking
  await syncFinishedGames()

  const { data, error } = await supabase
    .from('bets')
    .select('user_id, points_earned, users(name)')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type BetRow = { user_id: string; points_earned: number; users: { name: string } | null }
  const rows = (data ?? []) as unknown as BetRow[]

  const grouped: Record<string, { name: string; total: number; correct: number }> = {}
  for (const row of rows) {
    const name = row.users?.name ?? 'Desconhecido'
    if (!grouped[row.user_id]) {
      grouped[row.user_id] = { name, total: 0, correct: 0 }
    }
    grouped[row.user_id].total += row.points_earned ?? 0
    if ((row.points_earned ?? 0) > 0) grouped[row.user_id].correct++
  }

  const ranking = Object.entries(grouped)
    .map(([user_id, v]) => ({ user_id, name: v.name, total_points: v.total, correct_results: v.correct }))
    .sort((a, b) => b.total_points - a.total_points)

  return NextResponse.json(ranking)
}
