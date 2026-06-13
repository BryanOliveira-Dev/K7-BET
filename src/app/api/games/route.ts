import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const supabase = createServerClient()
  const now = new Date()
  const cutoffThreshold = new Date(now.getTime() + 10 * 60 * 1000) // +10min

  // Buscar jogos
  const { data: games, error } = await supabase
    .from('games')
    .select('*')
    .order('kickoff_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Buscar palpite do próprio usuário
  const { data: myBets } = await supabase
    .from('bets')
    .select('*')
    .eq('user_id', session.userId)

  const myBetsByGame = Object.fromEntries((myBets ?? []).map(b => [b.game_id, b]))

  // Palpites de outros: só visíveis após o corte (kickoff - 10min)
  let otherBets: Record<string, unknown[]> = {}
  const visibleGameIds = (games ?? [])
    .filter(g => new Date(g.kickoff_at) <= cutoffThreshold)
    .map(g => g.id)

  if (visibleGameIds.length > 0) {
    const { data: allBets } = await supabase
      .from('bets')
      .select('*, users(name)')
      .in('game_id', visibleGameIds)
      .neq('user_id', session.userId)

    otherBets = (allBets ?? []).reduce((acc, bet) => {
      acc[bet.game_id] = acc[bet.game_id] ?? []
      ;(acc[bet.game_id] as unknown[]).push(bet)
      return acc
    }, {} as Record<string, unknown[]>)
  }

  const result = (games ?? []).map(g => ({
    ...g,
    my_bet: myBetsByGame[g.id] ?? null,
    other_bets: otherBets[g.id] ?? [],
    bets_open: new Date(g.kickoff_at).getTime() - Date.now() > 10 * 60 * 1000,
  }))

  return NextResponse.json(result)
}
