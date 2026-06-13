'use client'

import { useState } from 'react'
import type { BetResult } from '@/lib/types'

interface Props {
  gameId: string
  homeTeam: string
  awayTeam: string
  homeOdds: number | null
  awayOdds: number | null
  drawOdds: number | null
  existingBet: { predicted_result: BetResult; predicted_home_score: number | null; predicted_away_score: number | null } | null
  onSuccess: () => void
}

export default function BetForm({ gameId, homeTeam, awayTeam, homeOdds, awayOdds, drawOdds, existingBet, onSuccess }: Props) {
  const [result, setResult] = useState<BetResult | ''>(existingBet?.predicted_result ?? '')
  const [homeScore, setHomeScore] = useState<string>(existingBet?.predicted_home_score?.toString() ?? '')
  const [awayScore, setAwayScore] = useState<string>(existingBet?.predicted_away_score?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!result) return
    setSaving(true)
    setError('')

    const res = await fetch('/api/bets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId,
        predicted_result: result,
        predicted_home_score: homeScore !== '' ? parseInt(homeScore) : null,
        predicted_away_score: awayScore !== '' ? parseInt(awayScore) : null,
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
            onClick={() => setResult(opt.value)}
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
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={20}
            value={homeScore}
            onChange={e => setHomeScore(e.target.value)}
            placeholder="0"
            className="w-12 text-center bg-gray-800 border border-gray-700 rounded px-1 py-1 text-white text-sm"
          />
          <span className="text-gray-500 text-xs">×</span>
          <input
            type="number"
            min={0}
            max={20}
            value={awayScore}
            onChange={e => setAwayScore(e.target.value)}
            placeholder="0"
            className="w-12 text-center bg-gray-800 border border-gray-700 rounded px-1 py-1 text-white text-sm"
          />
          <span className="text-gray-500 text-xs ml-1">(placar opcional)</span>
        </div>
      )}

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <button
        type="submit"
        disabled={!result || saving}
        className="w-full bg-green-600 text-white rounded-lg py-1.5 text-sm font-medium hover:bg-green-500 disabled:opacity-40 transition"
      >
        {saving ? 'Salvando...' : existingBet ? 'Atualizar palpite' : 'Confirmar palpite'}
      </button>
    </form>
  )
}
