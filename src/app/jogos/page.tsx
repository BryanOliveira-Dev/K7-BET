'use client'

import { useEffect, useState, useCallback } from 'react'
import GameCard from '@/components/GameCard'
import type { Game, Bet, OtherBet } from '@/lib/types'

type GameWithBet = Game & { my_bet: Bet | null; bets_open: boolean; other_bets: OtherBet[] }
type Tab = 'proximos' | 'matamata' | 'encerrados'

const PHASE_ORDER = ['r32', 'r16', 'qf', 'sf', 'final']
const PHASE_LABELS_LONG: Record<string, string> = {
  r32: 'Rodada de 32',
  r16: 'Oitavas de Final',
  qf: 'Quartas de Final',
  sf: 'Semifinais',
  final: 'Final',
}

function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Sao_Paulo',
  })
}

function getDayKey(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

function groupByDay(games: GameWithBet[]): { dayKey: string; label: string; games: GameWithBet[] }[] {
  const map = new Map<string, GameWithBet[]>()
  for (const game of games) {
    const key = getDayKey(game.kickoff_at)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(game)
  }
  return Array.from(map.entries()).map(([dayKey, dayGames]) => ({
    dayKey,
    label: formatDayLabel(dayGames[0].kickoff_at),
    games: dayGames,
  }))
}

function groupByPhase(games: GameWithBet[]): { phase: string; label: string; games: GameWithBet[] }[] {
  const map = new Map<string, GameWithBet[]>()
  for (const game of games) {
    if (!map.has(game.phase)) map.set(game.phase, [])
    map.get(game.phase)!.push(game)
  }
  return PHASE_ORDER
    .filter(phase => map.has(phase))
    .map(phase => ({ phase, label: PHASE_LABELS_LONG[phase], games: map.get(phase)! }))
}

export default function JogosPage() {
  const [games, setGames] = useState<GameWithBet[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('proximos')

  const fetchGames = useCallback(async () => {
    const res = await fetch('/api/games')
    if (res.ok) setGames(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchGames()
    const interval = setInterval(fetchGames, 30_000)
    return () => clearInterval(interval)
  }, [fetchGames])

  const upcoming = games.filter(g => g.status !== 'finished' && g.phase === 'group')
  const finished = games.filter(g => g.status === 'finished').reverse()
  const knockout = games.filter(g => g.phase !== 'group')

  const upcomingByDay = groupByDay(upcoming)
  const finishedByDay = groupByDay(finished)
  const knockoutByPhase = groupByPhase(knockout)

  const finishedCount = finished.length
  const knockoutCount = knockout.length

  return (
    <main className="min-h-screen text-slate-100 relative" style={{backgroundImage: 'url(/bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed'}}>
      <div className="absolute inset-0 bg-[#020617]/85 backdrop-blur-sm" />
      <div className="relative z-10 flex flex-col min-h-screen">
        <nav className="bg-slate-900/80 backdrop-blur border-b border-slate-800 px-4 py-3.5 flex items-center justify-between sticky top-0 z-10">
          <span className="font-bold text-slate-100 tracking-tight">
            K7 <span className="text-emerald-400">BET</span>
          </span>
          <div className="flex gap-4 text-sm">
            <a href="/jogos" className="text-slate-100 font-medium cursor-pointer">Jogos</a>
            <a href="/chaveamento" className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">Chaveamento</a>
            <a href="/torneio" className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">Torneio</a>
            <a href="/ranking" className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">Ranking</a>
          </div>
        </nav>

        {/* Tabs */}
        <div className="sticky top-[53px] z-10 bg-slate-900/90 backdrop-blur border-b border-slate-800">
          <div className="max-w-2xl mx-auto px-4 flex gap-0">
            <button
              onClick={() => setActiveTab('proximos')}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'proximos'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Grupos
            </button>
            <button
              onClick={() => setActiveTab('matamata')}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'matamata'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Mata-Mata
              {knockoutCount > 0 && (
                <span className="bg-slate-700 text-slate-300 text-xs px-1.5 py-0.5 rounded-full">
                  {knockoutCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('encerrados')}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'encerrados'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Encerrados
              {finishedCount > 0 && (
                <span className="bg-slate-700 text-slate-300 text-xs px-1.5 py-0.5 rounded-full">
                  {finishedCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8 w-full">
          {loading ? (
            <div className="text-slate-500 text-center py-16 text-sm">Carregando jogos...</div>
          ) : activeTab === 'proximos' ? (
            upcomingByDay.length === 0 ? (
              <div className="text-slate-500 text-center py-16 text-sm">Nenhum jogo de grupos próximo.</div>
            ) : (
              upcomingByDay.map(({ dayKey, label, games: dayGames }) => (
                <section key={dayKey} className="mb-10">
                  <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4 px-0.5 capitalize">
                    {label}
                  </h2>
                  <div className="space-y-3">
                    {dayGames.map(game => (
                      <GameCard key={game.id} game={game} otherBets={game.other_bets ?? []} onBetSaved={fetchGames} />
                    ))}
                  </div>
                </section>
              ))
            )
          ) : activeTab === 'matamata' ? (
            knockoutByPhase.length === 0 ? (
              <div className="text-slate-500 text-center py-16 text-sm">Nenhum jogo de mata-mata disponível ainda.</div>
            ) : (
              knockoutByPhase.map(({ phase, label, games: phaseGames }) => (
                <section key={phase} className="mb-10">
                  <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4 px-0.5">
                    {label}
                  </h2>
                  <div className="space-y-3">
                    {phaseGames.map(game => (
                      <GameCard key={game.id} game={game} otherBets={game.other_bets ?? []} onBetSaved={fetchGames} />
                    ))}
                  </div>
                </section>
              ))
            )
          ) : (
            finishedByDay.length === 0 ? (
              <div className="text-slate-500 text-center py-16 text-sm">Nenhum jogo encerrado ainda.</div>
            ) : (
              finishedByDay.map(({ dayKey, label, games: dayGames }) => (
                <section key={dayKey} className="mb-10">
                  <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4 px-0.5 capitalize">
                    {label}
                  </h2>
                  <div className="space-y-3">
                    {dayGames.map(game => (
                      <GameCard key={game.id} game={game} otherBets={game.other_bets ?? []} onBetSaved={fetchGames} />
                    ))}
                  </div>
                </section>
              ))
            )
          )}
        </div>
      </div>
    </main>
  )
}
