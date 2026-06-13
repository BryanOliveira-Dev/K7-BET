import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { fetchWorldCupGames } from '@/lib/football-api'
import { getSession } from '@/lib/auth'
import { calculateOdds } from '@/lib/odds-engine'

export async function POST() {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const games = await fetchWorldCupGames()
  const supabase = createServerClient()

  // Busca jogos já existentes para preservar odds editadas manualmente
  const { data: existing } = await supabase
    .from('games')
    .select('api_id, home_odds, draw_odds, away_odds')

  const existingOdds = new Map(
    (existing ?? []).map((g) => [g.api_id, g])
  )

  const gamesWithOdds = games.map((game) => {
    const prev = existingOdds.get(game.api_id)
    // Se já tem odds definidas manualmente, preserva
    if (prev?.home_odds && prev?.draw_odds && prev?.away_odds) {
      return { ...game, home_odds: prev.home_odds, draw_odds: prev.draw_odds, away_odds: prev.away_odds }
    }
    // Gera odds automáticas com base na força das seleções
    const odds = calculateOdds(game.home_team, game.away_team)
    return { ...game, ...odds }
  })

  const { error } = await supabase.from('games').upsert(
    gamesWithOdds,
    { onConflict: 'api_id', ignoreDuplicates: false }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ imported: gamesWithOdds.length })
}
