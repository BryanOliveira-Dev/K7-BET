import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { fetchFinishedResults } from '@/lib/football-api'
import { getSession } from '@/lib/auth'
import { calculatePoints } from '@/lib/points'
import type { Game } from '@/lib/types'

export async function POST() {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const supabase = createServerClient()

  // Busca resultados finalizados da API
  let finishedResults
  try {
    finishedResults = await fetchFinishedResults()
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }

  if (!finishedResults.length) {
    return NextResponse.json({ synced: 0, message: 'Nenhum jogo finalizado na API ainda.' })
  }

  // Busca jogos no banco que batem com os api_ids retornados
  const apiIds = finishedResults.map(r => r.api_id)
  const { data: games, error: gamesError } = await supabase
    .from('games')
    .select('*')
    .in('api_id', apiIds)
    .neq('status', 'finished') // só atualiza os que ainda não foram finalizados

  if (gamesError) return NextResponse.json({ error: gamesError.message }, { status: 500 })
  if (!games?.length) {
    return NextResponse.json({ synced: 0, message: 'Todos os jogos finalizados já foram sincronizados.' })
  }

  const resultsByApiId = Object.fromEntries(finishedResults.map(r => [r.api_id, r]))
  let totalUpdated = 0

  for (const game of games) {
    const result = resultsByApiId[game.api_id]
    if (!result) continue

    const { home_score, away_score } = result

    // Atualiza placar e status do jogo
    await supabase
      .from('games')
      .update({ home_score, away_score, status: 'finished' })
      .eq('id', game.id)

    // Busca palpites deste jogo
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
    totalUpdated++
  }

  return NextResponse.json({ synced: totalUpdated })
}
