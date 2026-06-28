'use client'

import { useEffect, useState } from 'react'
import type { Game, Bet, OtherBet } from '@/lib/types'

type GameWithBet = Game & { my_bet: Bet | null; bets_open: boolean; other_bets: OtherBet[] }

const PHASES_ORDER = ['r16', 'qf', 'sf', 'final'] as const
const PHASE_LABEL: Record<string, string> = {
  r16: 'Oitavas',
  qf: 'Quartas',
  sf: 'Semifinal',
  final: 'Final',
}
const BASE_SLOT = 88 // altura do slot em px para a fase com mais jogos

function getWinner(game: GameWithBet): 'home' | 'away' | null {
  if (game.status !== 'finished') return null
  if ((game.home_score ?? 0) > (game.away_score ?? 0)) return 'home'
  if ((game.away_score ?? 0) > (game.home_score ?? 0)) return 'away'
  return null
}

function TeamRow({
  flag, name, score, isWinner, showScore,
}: {
  flag: string | null; name: string; score: number | null; isWinner: boolean; showScore: boolean
}) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-2 ${isWinner ? 'bg-slate-800/70' : ''}`}>
      {flag
        ? <img src={flag} alt="" className="w-5 h-5 object-contain shrink-0" />
        : <div className="w-5 h-5 shrink-0 bg-slate-800 rounded-sm" />
      }
      <span className={`text-xs font-medium truncate flex-1 ${isWinner ? 'text-slate-100' : 'text-slate-400'}`}>
        {name}
      </span>
      {showScore && (
        <span className={`text-xs font-bold tabular-nums ml-1 ${isWinner ? 'text-emerald-400' : 'text-slate-600'}`}>
          {score ?? 0}
        </span>
      )}
    </div>
  )
}

function BracketCard({ game, slotHeight }: { game: GameWithBet | null; slotHeight: number }) {
  const winner = game ? getWinner(game) : null
  const isFinished = game?.status === 'finished'
  const isChampion = game?.phase === 'final' && isFinished

  return (
    <div className="flex items-center justify-center px-1" style={{ height: slotHeight }}>
      <div className={`w-44 bg-slate-900 rounded-xl overflow-hidden shrink-0 ${isChampion ? 'border border-amber-500/60 shadow-lg shadow-amber-500/10' : 'border border-slate-800'}`}>
        {game ? (
          <>
            <TeamRow
              flag={game.home_flag}
              name={game.home_team}
              score={game.home_score}
              isWinner={winner === 'home'}
              showScore={isFinished}
            />
            <div className="border-t border-slate-800" />
            <TeamRow
              flag={game.away_flag}
              name={game.away_team}
              score={game.away_score}
              isWinner={winner === 'away'}
              showScore={isFinished}
            />
            {!isFinished && (
              <div className="text-xs text-slate-700 text-center py-1.5 border-t border-slate-800">
                {new Date(game.kickoff_at).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo',
                })}
                {' '}
                {new Date(game.kickoff_at).toLocaleTimeString('pt-BR', {
                  hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
                })}
              </div>
            )}
            {isChampion && winner && (
              <div className="text-xs text-amber-400 text-center py-1.5 border-t border-amber-900/40 font-semibold">
                Campeão
              </div>
            )}
          </>
        ) : (
          <div className="py-5 text-center text-slate-700 text-xs">A definir</div>
        )}
      </div>
    </div>
  )
}

function BracketConnector({ gameCount, slotHeight }: { gameCount: number; slotHeight: number }) {
  const totalHeight = gameCount * slotHeight
  const pairs = Math.floor(gameCount / 2)

  return (
    <svg
      width="20"
      height={totalHeight}
      className="shrink-0 mt-8"
      style={{ overflow: 'visible' }}
    >
      {Array.from({ length: pairs }).map((_, i) => {
        const topY = i * 2 * slotHeight + slotHeight / 2
        const bottomY = (i * 2 + 1) * slotHeight + slotHeight / 2
        const midY = (topY + bottomY) / 2
        return (
          <g key={i}>
            <line x1="0" y1={topY} x2="0" y2={bottomY} stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="0" y1={midY} x2="20" y2={midY} stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        )
      })}
    </svg>
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

  const knockoutGames = games.filter(g => g.phase !== 'group')

  const byPhase: Record<string, GameWithBet[]> = {}
  for (const game of knockoutGames) {
    if (!byPhase[game.phase]) byPhase[game.phase] = []
    byPhase[game.phase].push(game)
  }
  for (const phase in byPhase) {
    byPhase[phase].sort((a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime())
  }

  const activePhases = PHASES_ORDER.filter(p => byPhase[p]?.length > 0)
  const maxGames = activePhases.length > 0
    ? Math.max(...activePhases.map(p => byPhase[p].length))
    : 1

  const totalHeight = maxGames * BASE_SLOT
  const HEADER_H = 32

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
          <h1 className="text-lg font-bold text-slate-100 tracking-tight mb-6">Chaveamento</h1>

          {loading ? (
            <div className="text-slate-500 text-center py-16 text-sm">Carregando...</div>
          ) : activePhases.length === 0 ? (
            <div className="text-slate-500 text-center py-16 text-sm">
              Nenhum jogo de mata-mata disponível ainda.
            </div>
          ) : (
            <div className="overflow-x-auto pb-6">
              <div className="flex items-start" style={{ height: totalHeight + HEADER_H, minWidth: 'max-content' }}>

                {activePhases.map((phase, phaseIndex) => {
                  const phaseGames = byPhase[phase]
                  const slotHeight = totalHeight / phaseGames.length
                  const hasNext = phaseIndex < activePhases.length - 1

                  return (
                    <div key={phase} className="flex items-start shrink-0">
                      {/* Phase column */}
                      <div className="flex flex-col shrink-0">
                        <div
                          className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-2 flex items-center"
                          style={{ height: HEADER_H }}
                        >
                          {PHASE_LABEL[phase]}
                        </div>
                        <div style={{ height: totalHeight }}>
                          {phaseGames.map(game => (
                            <BracketCard key={game.id} game={game} slotHeight={slotHeight} />
                          ))}
                        </div>
                      </div>

                      {/* Connector to next phase */}
                      {hasNext && (
                        <BracketConnector gameCount={phaseGames.length} slotHeight={slotHeight} />
                      )}
                    </div>
                  )
                })}

              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
