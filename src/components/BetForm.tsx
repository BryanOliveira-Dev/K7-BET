'use client'

import { useState } from 'react'
import type { BetResult, GamePhase } from '@/lib/types'

const KNOCKOUT_PHASES: GamePhase[] = ['r32', 'r16', 'qf', 'sf', 'final']

interface Props {
  gameId: string
  homeTeam: string
  awayTeam: string
  phase: GamePhase
  homeOdds: number | null
  awayOdds: number | null
  drawOdds: number | null
  existingBet: {
    predicted_result: BetResult
    predicted_home_score: number | null
    predicted_away_score: number | null
    tiebreaker_winner: 'home' | 'away' | null
  } | null
  onSuccess: () => void
}

function scoreIsConsistent(result: BetResult | '', home: string, away: string): boolean {
  const h = home !== '' ? parseInt(home) : 0
  const a = away !== '' ? parseInt(away) : 0
  if (isNaN(h) || isNaN(a)) return true
  if (result === 'home') return h > a
  if (result === 'draw') return h === a
  if (result === 'away') return a > h
  return true
}

function adjustScoresForResult(result: BetResult, home: string, away: string): { home: string; away: string } {
  const h = home !== '' ? parseInt(home) : 0
  const a = away !== '' ? parseInt(away) : 0
  if (result === 'home' && h <= a) return { home: String(a + 1), away: String(a) }
  if (result === 'draw' && h !== a) return { home: String(h), away: String(h) }
  if (result === 'away' && a <= h) return { home: String(h), away: String(h + 1) }
  return { home: String(h), away: String(a) }
}

export default function BetForm({ gameId, homeTeam, awayTeam, phase, homeOdds, awayOdds, drawOdds, existingBet, onSuccess }: Props) {
  const [result, setResult] = useState<BetResult | ''>(existingBet?.predicted_result ?? '')
  const [homeScore, setHomeScore] = useState<string>(existingBet?.predicted_home_score?.toString() ?? '')
  const [awayScore, setAwayScore] = useState<string>(existingBet?.predicted_away_score?.toString() ?? '')
  const [tiebreakerWinner, setTiebreakerWinner] = useState<'home' | 'away' | null>(existingBet?.tiebreaker_winner ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isKnockout = KNOCKOUT_PHASES.includes(phase)
  const showTiebreaker = result === 'draw' && isKnockout

  function handleSelectResult(value: BetResult) {
    setResult(value)
    const adjusted = adjustScoresForResult(value, homeScore, awayScore)
    setHomeScore(adjusted.home)
    setAwayScore(adjusted.away)
    if (value !== 'draw') setTiebreakerWinner(null)
  }

  const scoreConflict = result !== '' && !scoreIsConsistent(result, homeScore, awayScore)
  const tiebreakerRequired = showTiebreaker && !tiebreakerWinner

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!result) return
    if (scoreConflict) {
      setError('O placar não bate com o resultado escolhido.')
      return
    }
    if (tiebreakerRequired) {
      setError('Selecione quem passa nos pênaltis/prorrogação.')
      return
    }
    setSaving(true)
    setError('')

    const res = await fetch('/api/bets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId,
        predicted_result: result,
        predicted_home_score: homeScore !== '' ? parseInt(homeScore) : 0,
        predicted_away_score: awayScore !== '' ? parseInt(awayScore) : 0,
        tiebreaker_winner: showTiebreaker ? tiebreakerWinner : null,
      }),
    })

    setSaving(false)
    if (!res.ok) { setError((await res.json()).error); return }
    onSuccess()
  }

  const options: { value: BetResult; label: string; odds: number | null }[] = [
    { value: 'home', label: homeTeam, odds: homeOdds },
    { value: 'draw', label: 'Empate', odds: drawOdds },
    { value: 'away', label: awayTeam, odds: awayOdds },
  ]

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3">
      <div className="flex gap-2">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleSelectResult(opt.value)}
            className={`flex-1 rounded-lg py-2 px-1 text-xs font-medium border transition ${
              result === opt.value
                ? 'bg-yellow-400 text-black border-yellow-400'
                : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-500'
            }`}
          >
            <div>{opt.label}</div>
            {opt.odds && <div className="text-[10px] opacity-70 mt-0.5">{opt.odds.toFixed(2)}</div>}
          </button>
        ))}
      </div>

      {result && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={20}
              value={homeScore}
              onChange={e => setHomeScore(e.target.value)}
              placeholder="0"
              className={`w-12 text-center bg-gray-800 border rounded px-1 py-1 text-white text-sm ${scoreConflict ? 'border-red-500' : 'border-gray-700'}`}
            />
            <span className="text-gray-500 text-xs">×</span>
            <input
              type="number"
              min={0}
              max={20}
              value={awayScore}
              onChange={e => setAwayScore(e.target.value)}
              placeholder="0"
              className={`w-12 text-center bg-gray-800 border rounded px-1 py-1 text-white text-sm ${scoreConflict ? 'border-red-500' : 'border-gray-700'}`}
            />
            <span className="text-gray-500 text-xs ml-1">(placar no tempo normal)</span>
          </div>
          {scoreConflict && (
            <p className="text-red-400 text-xs">
              {result === 'home' && 'Para vitória do mandante, o placar deve ser maior em casa.'}
              {result === 'draw' && 'Para empate, os placares devem ser iguais.'}
              {result === 'away' && 'Para vitória do visitante, o placar deve ser maior fora.'}
            </p>
          )}
        </div>
      )}

      {showTiebreaker && (
        <div className="space-y-1.5">
          <p className="text-xs text-amber-400 font-medium">Quem passa nos pênaltis/prorrogação?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTiebreakerWinner('home')}
              className={`flex-1 rounded-lg py-2 px-2 text-xs font-medium border transition ${
                tiebreakerWinner === 'home'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-500'
              }`}
            >
              {homeTeam}
            </button>
            <button
              type="button"
              onClick={() => setTiebreakerWinner('away')}
              className={`flex-1 rounded-lg py-2 px-2 text-xs font-medium border transition ${
                tiebreakerWinner === 'away'
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-500'
              }`}
            >
              {awayTeam}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <button
        type="submit"
        disabled={!result || saving || scoreConflict || tiebreakerRequired}
        className="w-full bg-green-600 text-white rounded-lg py-1.5 text-sm font-medium hover:bg-green-500 disabled:opacity-40 transition"
      >
        {saving ? 'Salvando...' : existingBet ? 'Atualizar palpite' : 'Confirmar palpite'}
      </button>
    </form>
  )
}
