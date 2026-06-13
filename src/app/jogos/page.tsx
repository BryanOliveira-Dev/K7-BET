'use client'

import { useEffect, useState, useCallback } from 'react'
import GameCard from '@/components/GameCard'
import type { Game, Bet, OtherBet } from '@/lib/types'

type GameWithBet = Game & { my_bet: Bet | null; bets_open: boolean; other_bets: OtherBet[] }

const PHASE_ORDER = ['group', 'r16', 'qf', 'sf', 'final']
const PHASE_LABELS: Record<string, string> = {
  group: 'Fase de Grupos',
  r16: 'Oitavas de Final',
  qf: 'Quartas de Final',
  sf: 'Semifinal',
  final: 'Final',
}

export default function JogosPage() {
  const [games, setGames] = useState<GameWithBet[]>([])
  const [loading, setLoading] = useState(true)

  const fetchGames = useCallback(async () => {
    const res = await fetch('/api/games')
    if (res.ok) setGames(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchGames() }, [fetchGames])

  const byPhase = PHASE_ORDER.reduce((acc, phase) => {
    const phaseGames = games.filter(g => g.phase === phase)
    if (phaseGames.length) acc[phase] = phaseGames
    return acc
  }, {} as Record<string, GameWithBet[]>)

  return (
    <main className="min-h-screen text-slate-100 relative" style={{backgroundImage: 'url(/bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed'}}>
      <div className="absolute inset-0 bg-[#020617]/85 backdrop-blur-sm" />
      <div className="relative z-10 flex flex-col min-h-screen">
      <nav className="bg-slate-900/80 backdrop-blur border-b border-slate-800 px-4 py-3.5 flex items-center justify-between sticky top-0 z-10">
        <span className="font-bold text-slate-100 tracking-tight">
          K7 <span className="text-emerald-400">BET</span>
        </span>
        <div className="flex gap-6 text-sm">
          <a href="/jogos" className="text-slate-100 font-medium cursor-pointer">Jogos</a>
          <a href="/ranking" className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">Ranking</a>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-slate-500 text-center py-16 text-sm">Carregando jogos...</div>
        ) : Object.keys(byPhase).length === 0 ? (
          <div className="text-slate-500 text-center py-16 text-sm">Nenhum jogo cadastrado ainda.</div>
        ) : (
          Object.entries(byPhase).map(([phase, phaseGames]) => (
            <section key={phase} className="mb-10">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4 px-0.5">
                {PHASE_LABELS[phase]}
              </h2>
              <div className="space-y-3">
                {phaseGames.map(game => (
                  <GameCard key={game.id} game={game} otherBets={game.other_bets ?? []} onBetSaved={fetchGames} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
      </div>
    </main>
  )
}
