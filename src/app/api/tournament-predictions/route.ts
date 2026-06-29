import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const supabase = createServerClient()

  const [{ data: prediction }, { data: result }, { data: firstScheduled }] = await Promise.all([
    supabase.from('tournament_predictions').select('*').eq('user_id', session.userId).maybeSingle(),
    supabase.from('tournament_results').select('*').order('set_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('games').select('kickoff_at').eq('status', 'scheduled').order('kickoff_at', { ascending: true }).limit(1).maybeSingle(),
  ])

  // Aberto até o próximo jogo agendado começar; sem jogos agendados = encerrado
  const locked = firstScheduled ? new Date(firstScheduled.kickoff_at).getTime() <= Date.now() : true

  return NextResponse.json({ prediction: prediction ?? null, result: result ?? null, locked })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const supabase = createServerClient()

  const { data: firstScheduled } = await supabase
    .from('games')
    .select('kickoff_at')
    .eq('status', 'scheduled')
    .order('kickoff_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!firstScheduled || new Date(firstScheduled.kickoff_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: 'Prazo encerrado — palpites fechados' }, { status: 400 })
  }

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
