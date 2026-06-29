'use client'

import { useEffect, useState } from 'react'
import type { Game, Bet, OtherBet, TournamentPrediction, TournamentResult } from '@/lib/types'

type GameWithBet = Game & { my_bet: Bet | null; bets_open: boolean; other_bets: OtherBet[] }

const PHASES_ORDER = ['r16', 'qf', 'sf', 'final'] as const
const PHASE_LABEL: Record<string, string> = { r16: 'Oitavas', qf: 'Quartas', sf: 'Semifinal', final: 'Final' }
const SLOT = 80

function getWinner(game: GameWithBet): 'home' | 'away' | null {
  if (game.status !== 'finished') return null
  if ((game.home_score ?? 0) > (game.away_score ?? 0)) return 'home'
  if ((game.away_score ?? 0) > (game.home_score ?? 0)) return 'away'
  return null
}

function BracketMiniCard({ game, slotHeight }: { game: GameWithBet | null; slotHeight: number }) {
  const winner = game ? getWinner(game) : null
  const isFinished = game?.status === 'finished'
  const isChampion = game?.phase === 'final' && isFinished
  return (
    <div className="flex items-center justify-center px-1" style={{ height: slotHeight }}>
      <div className={`w-36 bg-slate-900 rounded-xl overflow-hidden shrink-0 ${isChampion ? 'border border-amber-500/60 shadow-lg shadow-amber-500/10' : 'border border-slate-800'}`}>
        {game ? (
          <>
            <div className={`flex items-center gap-1.5 px-2 py-1.5 ${winner === 'home' ? 'bg-slate-800/70' : ''}`}>
              {game.home_flag
                ? <img src={game.home_flag} alt="" className="w-4 h-4 object-contain shrink-0" />
                : <div className="w-4 h-4 shrink-0 bg-slate-800 rounded-sm" />}
              <span className={`text-[11px] font-medium truncate flex-1 ${winner === 'home' ? 'text-slate-100' : 'text-slate-400'}`}>
                {game.home_team}
              </span>
              {isFinished && (
                <span className={`text-[11px] font-bold tabular-nums ${winner === 'home' ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {game.home_score ?? 0}
                </span>
              )}
            </div>
            <div className="border-t border-slate-800" />
            <div className={`flex items-center gap-1.5 px-2 py-1.5 ${winner === 'away' ? 'bg-slate-800/70' : ''}`}>
              {game.away_flag
                ? <img src={game.away_flag} alt="" className="w-4 h-4 object-contain shrink-0" />
                : <div className="w-4 h-4 shrink-0 bg-slate-800 rounded-sm" />}
              <span className={`text-[11px] font-medium truncate flex-1 ${winner === 'away' ? 'text-slate-100' : 'text-slate-400'}`}>
                {game.away_team}
              </span>
              {isFinished && (
                <span className={`text-[11px] font-bold tabular-nums ${winner === 'away' ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {game.away_score ?? 0}
                </span>
              )}
            </div>
            {!isFinished && (
              <div className="text-[10px] text-slate-700 text-center py-1 border-t border-slate-800">
                {new Date(game.kickoff_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })}
              </div>
            )}
            {isChampion && winner && (
              <div className="text-[10px] text-amber-400 text-center py-1 border-t border-amber-900/40 font-semibold">Campeão</div>
            )}
          </>
        ) : (
          <div className="py-4 text-center text-slate-700 text-[10px]">A definir</div>
        )}
      </div>
    </div>
  )
}

function BracketSVGConn({ count, slotH, flipped = false }: { count: number; slotH: number; flipped?: boolean }) {
  const totalH = count * slotH
  const pairs = Math.floor(count / 2)
  return (
    <svg
      width="20"
      height={totalH}
      style={{ display: 'block', overflow: 'visible', transform: flipped ? 'scaleX(-1)' : undefined }}
    >
      {count === 1 ? (
        <line x1="0" y1={slotH / 2} x2="20" y2={slotH / 2} stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
      ) : (
        Array.from({ length: pairs }).map((_, i) => {
          const topY = i * 2 * slotH + slotH / 2
          const botY = (i * 2 + 1) * slotH + slotH / 2
          const midY = (topY + botY) / 2
          return (
            <g key={i}>
              <line x1="0" y1={topY} x2="0" y2={botY} stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="0" y1={midY} x2="20" y2={midY} stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
            </g>
          )
        })
      )}
    </svg>
  )
}

function TwoSidedBracket({ games }: { games: GameWithBet[] }) {
  const knockout = games.filter(g => g.phase !== 'group')
  if (knockout.length === 0) {
    return (
      <div className="text-slate-600 text-sm text-center py-10">
        Chaveamento disponível após a fase de grupos.
      </div>
    )
  }

  const byPhase: Partial<Record<string, GameWithBet[]>> = {}
  for (const g of knockout) {
    if (!byPhase[g.phase]) byPhase[g.phase] = []
    byPhase[g.phase]!.push(g)
  }
  for (const p in byPhase) {
    byPhase[p]!.sort((a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime())
  }

  const activePhases = (PHASES_ORDER as readonly string[]).filter(p => byPhase[p]?.length)
  if (activePhases.length === 0) return null

  const finalPhase = activePhases[activePhases.length - 1]
  const midPhases = activePhases.slice(0, -1)
  const finalGames = byPhase[finalPhase]!

  // Split each non-final phase: left = first half, right = second half
  const leftCols = midPhases.map(p => {
    const all = byPhase[p]!
    return { phase: p, games: all.slice(0, Math.ceil(all.length / 2)) }
  })
  // Right cols ordered inner → outer (closest to final first)
  const rightCols = [...midPhases].reverse().map(p => {
    const all = byPhase[p]!
    return { phase: p, games: all.slice(Math.ceil(all.length / 2)) }
  })

  const maxSide = leftCols.length > 0 ? Math.max(...leftCols.map(c => c.games.length)) : 1
  const totalH = Math.max(maxSide, 1) * SLOT
  const HDR = 28

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex items-start" style={{ minWidth: 'max-content' }}>

        {/* Left side: outermost → innermost (r16 → qf → sf) */}
        {leftCols.map((col) => {
          const slotH = totalH / col.games.length
          return (
            <div key={col.phase + 'L'} className="flex items-start shrink-0">
              <div className="flex flex-col shrink-0">
                <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-1 flex items-center" style={{ height: HDR }}>
                  {PHASE_LABEL[col.phase]}
                </div>
                <div style={{ height: totalH }}>
                  {col.games.map(g => <BracketMiniCard key={g.id} game={g} slotHeight={slotH} />)}
                </div>
              </div>
              <div className="flex flex-col shrink-0">
                <div style={{ height: HDR }} />
                <BracketSVGConn count={col.games.length} slotH={slotH} />
              </div>
            </div>
          )
        })}

        {/* Final (center) */}
        <div className="flex flex-col shrink-0">
          <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-1 flex items-center" style={{ height: HDR }}>
            Final
          </div>
          <div style={{ height: totalH }} className="flex items-center">
            <BracketMiniCard game={finalGames[0] ?? null} slotHeight={totalH} />
          </div>
        </div>

        {/* Right side: innermost → outermost (sf → qf → r16), each with flipped connector before it */}
        {rightCols.map((col) => {
          const slotH = totalH / Math.max(col.games.length, 1)
          return (
            <div key={col.phase + 'R'} className="flex items-start shrink-0">
              <div className="flex flex-col shrink-0">
                <div style={{ height: HDR }} />
                <BracketSVGConn count={Math.max(col.games.length, 1)} slotH={slotH} flipped />
              </div>
              <div className="flex flex-col shrink-0">
                <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-1 flex items-center" style={{ height: HDR }}>
                  {PHASE_LABEL[col.phase]}
                </div>
                <div style={{ height: totalH }}>
                  {col.games.map(g => <BracketMiniCard key={g.id} game={g} slotHeight={slotH} />)}
                </div>
              </div>
            </div>
          )
        })}

      </div>
    </div>
  )
}

export default function TorneioPage() {
  const [prediction, setPrediction] = useState<TournamentPrediction | null>(null)
  const [result, setResult] = useState<TournamentResult | null>(null)
  const [locked, setLocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [games, setGames] = useState<GameWithBet[]>([])
  const [form, setForm] = useState({ champion: '', runner_up: '', top_scorer: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function fetchAll() {
    const [predRes, gamesRes] = await Promise.all([
      fetch('/api/tournament-predictions'),
      fetch('/api/games'),
    ])
    if (predRes.ok) {
      const data = await predRes.json()
      setPrediction(data.prediction)
      setResult(data.result)
      setLocked(data.locked)
      if (data.prediction) {
        setForm({
          champion: data.prediction.champion ?? '',
          runner_up: data.prediction.runner_up ?? '',
          top_scorer: data.prediction.top_scorer ?? '',
        })
      }
    }
    if (gamesRes.ok) setGames(await gamesRes.json())
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  async function handleSave() {
    setSaving(true)
    setMessage('')
    const res = await fetch('/api/tournament-predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (res.ok) { setMessage('Palpites salvos!'); fetchAll() }
    else setMessage(data.error ?? 'Erro ao salvar')
    setSaving(false)
  }

  const totalPoints = prediction
    ? (prediction.champion_points ?? 0) + (prediction.runner_up_points ?? 0) + (prediction.top_scorer_points ?? 0)
    : 0

  return (
    <main className="min-h-screen text-slate-100 relative" style={{ backgroundImage: 'url(/bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      <div className="absolute inset-0 bg-[#020617]/85 backdrop-blur-sm" />
      <div className="relative z-10 flex flex-col min-h-screen">

        <nav className="bg-slate-900/80 backdrop-blur border-b border-slate-800 px-4 py-3.5 flex items-center justify-between sticky top-0 z-10">
          <span className="font-bold text-slate-100 tracking-tight">
            K7 <span className="text-emerald-400">BET</span>
          </span>
          <div className="flex gap-4 text-sm">
            <a href="/jogos" className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">Jogos</a>
            <a href="/chaveamento" className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">Chaveamento</a>
            <a href="/torneio" className="text-slate-100 font-medium cursor-pointer">Torneio</a>
            <a href="/ranking" className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">Ranking</a>
          </div>
        </nav>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Carregando...</div>
        ) : (
          <div className="px-4 py-8 w-full">

            {/* Bracket section */}
            <h1 className="text-lg font-bold text-slate-100 tracking-tight mb-4">Chaveamento</h1>
            <TwoSidedBracket games={games} />

            {/* Prediction form */}
            <div className="max-w-xl mx-auto mt-8">
              <h2 className="text-base font-bold text-slate-100 tracking-tight mb-1">Palpites do Torneio</h2>
              <p className="text-xs text-slate-500 mb-5">Acerte o campeão, vice e artilheiro para ganhar pontos extras.</p>

              {result && prediction && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-4">
                  <h3 className="font-semibold text-slate-100 text-sm mb-3">Resultado Oficial</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Campeão', official: result.champion, predicted: prediction.champion, points: prediction.champion_points, max: 15 },
                      { label: 'Vice-campeão', official: result.runner_up, predicted: prediction.runner_up, points: prediction.runner_up_points, max: 8 },
                      { label: 'Artilheiro', official: result.top_scorer, predicted: prediction.top_scorer, points: prediction.top_scorer_points, max: 8 },
                    ].map(({ label, official, predicted, points, max }) => (
                      <div key={label} className="flex items-center justify-between">
                        <div>
                          <span className="text-slate-500 text-xs">{label}: </span>
                          <span className="text-slate-200 text-sm">{official ?? '—'}</span>
                          {predicted && <span className="text-slate-600 text-xs ml-2">(seu: {predicted})</span>}
                        </div>
                        <span className={`font-bold tabular-nums text-sm ${points > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                          {points > 0 ? `+${points}` : '0'}/{max}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-800 mt-3 pt-3 flex justify-between">
                    <span className="text-sm text-slate-400 font-medium">Total torneio</span>
                    <span className={`font-bold text-sm tabular-nums ${totalPoints > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>+{totalPoints} pts</span>
                  </div>
                </div>
              )}

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-100 text-sm">Seus Palpites</h3>
                  {locked && (
                    <span className="text-xs text-amber-400 bg-amber-950/50 border border-amber-900/50 rounded-full px-2.5 py-1">
                      Prazo encerrado
                    </span>
                  )}
                </div>

                {message && (
                  <p className={`text-sm mb-4 px-3 py-2 rounded-lg ${message.includes('Erro') || message.includes('encerrado') ? 'text-red-400 bg-red-950/30 border border-red-900/30' : 'text-emerald-400 bg-emerald-950/30 border border-emerald-900/30'}`}>
                    {message}
                  </p>
                )}

                <div className="space-y-4">
                  {([
                    { key: 'champion' as const, label: 'Campeão', pts: 15 },
                    { key: 'runner_up' as const, label: 'Vice-campeão', pts: 8 },
                    { key: 'top_scorer' as const, label: 'Artilheiro', pts: 8 },
                  ]).map(({ key, label, pts }) => (
                    <div key={key}>
                      <label className="text-xs text-slate-500 block mb-1.5">
                        {label} <span className="text-emerald-600">+{pts} pts</span>
                      </label>
                      <input
                        type="text"
                        value={form[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        disabled={locked}
                        placeholder={locked ? (prediction?.[key] ?? '—') : `Nome do ${label.toLowerCase()}`}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  ))}
                </div>

                {!locked && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="mt-5 w-full bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    {saving ? 'Salvando...' : prediction ? 'Atualizar Palpites' : 'Salvar Palpites'}
                  </button>
                )}
              </div>

              <div className="mt-4 bg-slate-900/50 border border-slate-800/50 rounded-2xl p-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Pontuação</h3>
                <div className="space-y-1.5">
                  {[
                    { label: 'Acertar o campeão', pts: '15 pts' },
                    { label: 'Acertar o vice-campeão', pts: '8 pts' },
                    { label: 'Acertar o artilheiro', pts: '8 pts' },
                  ].map(({ label, pts }) => (
                    <div key={label} className="flex justify-between text-xs">
                      <span className="text-slate-400">{label}</span>
                      <span className="text-emerald-500 font-semibold">{pts}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </main>
  )
}
