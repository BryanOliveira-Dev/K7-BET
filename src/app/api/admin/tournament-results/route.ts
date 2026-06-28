import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { champion, runner_up, top_scorer } = await req.json()

  const supabase = createServerClient()

  const { error: insertError } = await supabase
    .from('tournament_results')
    .insert({ champion, runner_up, top_scorer })

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  const { data: predictions } = await supabase
    .from('tournament_predictions')
    .select('id, champion, runner_up, top_scorer')

  if (!predictions?.length) return NextResponse.json({ ok: true, updated: 0 })

  let updated = 0
  for (const pred of predictions) {
    await supabase
      .from('tournament_predictions')
      .update({
        champion_points: pred.champion && pred.champion === champion ? 15 : 0,
        runner_up_points: pred.runner_up && pred.runner_up === runner_up ? 8 : 0,
        top_scorer_points: pred.top_scorer && pred.top_scorer === top_scorer ? 8 : 0,
      })
      .eq('id', pred.id)
    updated++
  }

  return NextResponse.json({ ok: true, updated })
}
