'use client'

import { useEffect, useState, useCallback } from 'react'
import type { RankingEntry } from '@/lib/types'

const POSITION_STYLES = [
  'text-amber-400 font-bold',
  'text-slate-300 font-semibold',
  'text-amber-700 font-semibold',
]

export default function RankingTable() {
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRanking = useCallback(async () => {
    const res = await fetch('/api/ranking')
    if (res.ok) setRanking(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRanking()
    const interval = setInterval(fetchRanking, 30_000)
    return () => clearInterval(interval)
  }, [fetchRanking])

  if (loading) return <p className="text-slate-500 text-center py-8 text-sm">Carregando ranking...</p>
  if (!ranking.length) return <p className="text-slate-500 text-center py-8 text-sm">Nenhum palpite ainda.</p>

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-800">
            <th className="text-left text-xs font-medium text-slate-500 px-4 py-3 w-10">#</th>
            <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Jogador</th>
            <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Acertos</th>
            <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Pontos</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((entry, i) => (
            <tr key={entry.user_id} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30 transition-colors">
              <td className={`px-4 py-3.5 text-sm tabular-nums ${POSITION_STYLES[i] ?? 'text-slate-500'}`}>
                {i + 1}
              </td>
              <td className="px-4 py-3.5 text-slate-100 font-medium text-sm">{entry.name}</td>
              <td className="px-4 py-3.5 text-right text-slate-400 text-sm tabular-nums">{entry.correct_results}</td>
              <td className="px-4 py-3.5 text-right text-amber-400 font-bold text-sm tabular-nums">{entry.total_points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
