import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { findFixtureId, fetchLineup } from '@/lib/apifootball'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const gameId = req.nextUrl.searchParams.get('gameId')
  if (!gameId) return NextResponse.json({ error: 'gameId obrigatório' }, { status: 400 })

  if (!process.env.APIFOOTBALL_KEY) {
    return NextResponse.json(
      { error: 'APIFOOTBALL_KEY não configurada. Cadastre-se em api-football.com e adicione a chave ao .env.' },
      { status: 503 }
    )
  }

  const supabase = createServerClient()
  const { data: game } = await supabase
    .from('games')
    .select('home_team, away_team, kickoff_at')
    .eq('id', gameId)
    .single()

  if (!game) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 })

  const fixtureId = await findFixtureId(game.home_team, game.away_team, game.kickoff_at)
  if (!fixtureId) {
    return NextResponse.json(
      { error: 'Jogo não encontrado na API-Football. Escalação disponível ~1h antes do jogo.' },
      { status: 404 }
    )
  }

  const lineup = await fetchLineup(fixtureId)
  if (!lineup) {
    return NextResponse.json(
      { error: 'Escalação ainda não divulgada. Tente novamente mais próximo do kickoff.' },
      { status: 404 }
    )
  }

  return NextResponse.json(lineup)
}
