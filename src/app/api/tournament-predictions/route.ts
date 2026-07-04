import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

// Prazo dos palpites do torneio: 04/07/2026 às 15h (horário de Brasília)
const TOURNAMENT_DEADLINE = new Date('2026-07-04T15:00:00-03:00').getTime()

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const supabase = createServerClient()

  const [{ data: prediction }, { data: result }] = await Promise.all([
    supabase.from('tournament_predictions').select('*').eq('user_id', session.userId).maybeSingle(),
    supabase.from('tournament_results').select('*').order('set_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const locked = Date.now() >= TOURNAMENT_DEADLINE

  return NextResponse.json({ prediction: prediction ?? null, result: result ?? null, locked })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (Date.now() >= TOURNAMENT_DEADLINE) {
    return NextResponse.json({ error: 'Prazo encerrado — palpites fechados' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { champion, runner_up, top_scorer } = await req.json()

  const { error } = await supabase
    .from('tournament_predictions')
    .upsert(
      { user_id: session.userId, champion, runner_up, top_scorer },
      { onConflict: 'user_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
