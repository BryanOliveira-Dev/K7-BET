'use client'

import { useEffect, useState } from 'react'
import type { TournamentPrediction, TournamentResult } from '@/lib/types'

export default function TorneioPage() {
  const [prediction, setPrediction] = useState<TournamentPrediction | null>(null)
  const [result, setResult] = useState<TournamentResult | null>(null)
  const [locked, setLocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ champion: '', runner_up: '', top_scorer: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function fetchData() {
    const res = await fetch('/api/tournament-predictions')
    if (res.ok) {
      const data = await res.json()
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
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function handleSave() {
    setSaving(true)
    setMessage('')
    const res = await fetch('/api/tournament-predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (res.ok) {
      setMessage('Palpites salvos!')
      fetchData()
    } else {
      setMessage(data.error ?? 'Erro ao salvar')
    }
    setSaving(false)
  }

  const totalPoints = prediction
    ? (prediction.champion_points ?? 0) + (prediction.runner_up_points ?? 0) + (prediction.top_scorer_points ?? 0)
    : 0

  return (
    <main className="min-h-screen text-slate-100 relative" style={{backgroundImage: 'url(/bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed'}}>
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

        <div className="max-w-2xl mx-auto px-4 py-8 w-full">
          <h1 className="text-lg font-bold text-slate-100 tracking-tight mb-2">Palpites do Torneio</h1>
          <p className="text-sm text-slate-500 mb-6">Campeão, vice-campeão e artilheiro — acertar vale pontos extras.</p>

          {loading ? (
            <div className="text-slate-500 text-center py-16 text-sm">Carregando...</div>
          ) : (
            <>
              {result && prediction && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-4">
                  <h2 className="font-semibold text-slate-100 text-sm mb-3">Resultado Oficial</h2>
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
                          {predicted && (
                            <span className="text-slate-600 text-xs ml-2">(seu: {predicted})</span>
                          )}
                        </div>
                        <span className={`font-bold tabular-nums text-sm ${points > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                          {points > 0 ? `+${points}` : '0'}/{max}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-800 mt-3 pt-3 flex justify-between">
                    <span className="text-sm text-slate-400 font-medium">Total torneio</span>
                    <span className={`font-bold text-sm tabular-nums ${totalPoints > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                      +{totalPoints} pts
                    </span>
                  </div>
                </div>
              )}

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-slate-100 text-sm">Seus Palpites</h2>
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
            </>
          )}
        </div>
      </div>
    </main>
  )
}
