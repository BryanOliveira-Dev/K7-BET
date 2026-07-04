'use client'

import { useEffect, useState } from 'react'
import type { Game, Bet, OtherBet } from '@/lib/types'

type GameWithBet = Game & { my_bet: Bet | null; bets_open: boolean; other_bets: OtherBet[] }

const PHASES_ORDER = ['r32', 'r16', 'qf', 'sf', 'final'] as const
const PHASE_LABEL: Record<string, string> = { r32: 'Rodada 32', r16: 'Oitavas', qf: 'Quartas', sf: 'Semifinal', final: 'Final' }
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

type BracketColumn = { phase: string; games: (GameWithBet | null)[] }

// Monta as colunas do mata-mata da primeira fase disputada até a final, preenchendo
// com vagas "A definir" as fases futuras cujos jogos ainda não foram cadastrados.
function buildColumns(byPhase: Partial<Record<string, GameWithBet[]>>): BracketColumn[] {
  const firstIdx = PHASES_ORDER.findIndex(p => (byPhase[p]?.length ?? 0) > 0)
  if (firstIdx === -1) return []

  const columns: BracketColumn[] = []
  let prevCount: number | null = null

  for (let i = firstIdx; i < PHASES_ORDER.length; i++) {
    const phase = PHASES_ORDER[i]
    const real = byPhase[phase]
    const count: number = real?.length ? real.length : Math.max(1, Math.round((prevCount ?? 2) / 2))
    const slots: (GameWithBet | null)[] = real ? [...real] : []
    while (slots.length < count) slots.push(null)
    columns.push({ phase, games: slots.slice(0, count) })
    prevCount = count
  }

  return columns
}

function TwoSidedBracket({ games }: { games: GameWithBet[] }) {
  const knockout = games.filter(g => g.phase !== 'group')
  if (knockout.length === 0) {
    return (
      <div className="text-slate-500 text-sm text-center py-16">
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

  const columns = buildColumns(byPhase)
  if (columns.length === 0) return null

  const finalCol = columns[columns.length - 1]
  const midCols = columns.slice(0, -1)

  // Divide cada fase intermediária: esquerda = primeira metade, direita = segunda metade
  const leftCols = midCols.map(c => ({ phase: c.phase, games: c.games.slice(0, Math.ceil(c.games.length / 2)) }))
  // Colunas da direita ordenadas de dentro para fora (mais próxima da final primeiro)
  const rightCols = [...midCols].reverse().map(c => ({ phase: c.phase, games: c.games.slice(Math.ceil(c.games.length / 2)) }))

  const maxSide = leftCols.length > 0 ? Math.max(...leftCols.map(c => c.games.length)) : 1
  const totalH = Math.max(maxSide, 1) * SLOT
  const HDR = 28

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex items-start" style={{ minWidth: 'max-content' }}>

        {/* Lado esquerdo: mais externo → mais interno */}
        {leftCols.map((col) => {
          const slotH = totalH / col.games.length
          return (
            <div key={col.phase + 'L'} className="flex items-start shrink-0">
              <div className="flex flex-col shrink-0">
                <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-1 flex items-center" style={{ height: HDR }}>
                  {PHASE_LABEL[col.phase]}
                </div>
                <div style={{ height: totalH }}>
                  {col.games.map((g, idx) => <BracketMiniCard key={g?.id ?? `${col.phase}-L-${idx}`} game={g} slotHeight={slotH} />)}
                </div>
              </div>
              <div className="flex flex-col shrink-0">
                <div style={{ height: HDR }} />
                <BracketSVGConn count={col.games.length} slotH={slotH} />
              </div>
            </div>
          )
        })}

        {/* Final (centro) */}
        <div className="flex flex-col shrink-0">
          <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-1 flex items-center" style={{ height: HDR }}>
            Final
          </div>
          <div style={{ height: totalH }} className="flex items-center">
            <BracketMiniCard game={finalCol.games[0] ?? null} slotHeight={totalH} />
          </div>
        </div>

        {/* Lado direito: mais interno → mais externo, cada um com conector espelhado antes */}
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
                  {col.games.map((g, idx) => <BracketMiniCard key={g?.id ?? `${col.phase}-R-${idx}`} game={g} slotHeight={slotH} />)}
                </div>
              </div>
            </div>
          )
        })}

      </div>
    </div>
  )
}

export default function ChaveamentoPage() {
  const [games, setGames] = useState<GameWithBet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/games')
      .then(r => r.json())
      .then(data => { setGames(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <main
      className="min-h-screen text-slate-100 relative"
      style={{ backgroundImage: 'url(/bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}
    >
      <div className="absolute inset-0 bg-[#020617]/85 backdrop-blur-sm" />
      <div className="relative z-10 flex flex-col min-h-screen">

        <nav className="bg-slate-900/80 backdrop-blur border-b border-slate-800 px-4 py-3.5 flex items-center justify-between sticky top-0 z-10">
          <span className="font-bold text-slate-100 tracking-tight">
            K7 <span className="text-emerald-400">BET</span>
          </span>
          <div className="flex gap-4 text-sm">
            <a href="/jogos" className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">Jogos</a>
            <a href="/chaveamento" className="text-slate-100 font-medium cursor-pointer">Chaveamento</a>
            <a href="/torneio" className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">Torneio</a>
            <a href="/ranking" className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">Ranking</a>
          </div>
        </nav>

        <div className="px-4 py-8 w-full">
          <h1 className="text-lg font-bold text-slate-100 tracking-tight mb-1">Chaveamento</h1>
          <p className="text-xs text-slate-500 mb-6">Acompanhe o caminho das seleções até a grande final.</p>

          {loading ? (
            <div className="text-slate-500 text-center py-16 text-sm">Carregando...</div>
          ) : (
            <TwoSidedBracket games={games} />
          )}
        </div>
      </div>
    </main>
  )
}
