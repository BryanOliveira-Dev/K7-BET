'use client'

import { useEffect, useState } from 'react'
import type { Game } from '@/lib/types'

interface LineupPlayer { name: string; number: number; position: string }
interface TeamLineup { team: string; formation: string; startXI: LineupPlayer[]; substitutes: LineupPlayer[] }
interface Lineup { home: TeamLineup; away: TeamLineup }

export default function AdminPage() {
  const [games, setGames] = useState<Game[]>([])
  const [importing, setImporting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [fixingScores, setFixingScores] = useState(false)
  const [message, setMessage] = useState('')
  const [tournamentResult, setTournamentResult] = useState({ champion: '', runner_up: '', top_scorer: '' })
  const [savingTournament, setSavingTournament] = useState(false)
  const [selectedGame, setSelectedGame] = useState<string>('')
  const [odds, setOdds] = useState({ home: '', draw: '', away: '' })
  const [result, setResult] = useState({ home: '', away: '' })
  const [lineup, setLineup] = useState<Lineup | null>(null)
  const [loadingLineup, setLoadingLineup] = useState(false)
  const [lineupError, setLineupError] = useState('')

  async function fetchGames() {
    const res = await fetch('/api/games')
    if (res.ok) setGames(await res.json())
  }

  useEffect(() => { fetchGames() }, [])

  async function handleImport() {
    setImporting(true)
    setMessage('')
    const res = await fetch('/api/admin/import-games', { method: 'POST' })
    const data = await res.json()
    setMessage(res.ok ? `${data.imported} jogos importados` : `Erro: ${data.error}`)
    setImporting(false)
    fetchGames()
  }

  async function handleFixNullScores() {
    setFixingScores(true)
    setMessage('')
    const res = await fetch('/api/admin/fix-null-scores', { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setMessage(`Placares null corrigidos: ${data.null_scores_fixed}. Pontos recalculados: ${data.points_recalculated} (${data.finished_games} jogos finalizados).`)
    } else {
      setMessage(`Erro: ${data.error}`)
    }
    setFixingScores(false)
  }

  async function handleFixOrphanBets() {
    setFixing(true)
    setMessage('')
    const res = await fetch('/api/admin/fix-orphan-bets', { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setMessage(data.inserted_games?.length > 0
        ? `Jogos restaurados: ${data.inserted_games.join(', ')}. ${data.points_updated} apostas pontuadas.`
        : (data.message ?? 'Nenhuma aposta órfã encontrada.'))
    } else {
      setMessage(`Erro: ${data.error}`)
    }
    setFixing(false)
    fetchGames()
  }

  async function handleSyncResults() {
    setSyncing(true)
    setMessage('')
    const res = await fetch('/api/admin/sync-results', { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setMessage(data.synced > 0 ? `${data.synced} jogo(s) sincronizado(s) com pontos calculados.` : (data.message ?? 'Nada novo para sincronizar.'))
    } else {
      setMessage(`Erro: ${data.error}`)
    }
    setSyncing(false)
    fetchGames()
  }

  async function handleSaveOdds() {
    if (!selectedGame) return
    const res = await fetch('/api/admin/odds', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: selectedGame,
        home_odds: parseFloat(odds.home) || null,
        draw_odds: parseFloat(odds.draw) || null,
        away_odds: parseFloat(odds.away) || null,
      }),
    })
    setMessage(res.ok ? 'Odds salvas com sucesso' : 'Erro ao salvar odds')
  }

  async function handleFetchLineup() {
    if (!selectedGame) return
    setLoadingLineup(true)
    setLineup(null)
    setLineupError('')
    const res = await fetch(`/api/admin/lineup?gameId=${selectedGame}`)
    const data = await res.json()
    if (res.ok) setLineup(data)
    else setLineupError(data.error ?? 'Erro ao buscar escalação')
    setLoadingLineup(false)
  }

  async function handleSaveTournamentResult() {
    setSavingTournament(true)
    setMessage('')
    const res = await fetch('/api/admin/tournament-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tournamentResult),
    })
    const data = await res.json()
    setMessage(res.ok ? `Resultado do torneio salvo. ${data.updated} palpites pontuados.` : `Erro: ${data.error}`)
    setSavingTournament(false)
  }

  async function handleSaveResult() {
    if (!selectedGame) return
    const res = await fetch('/api/admin/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: selectedGame,
        home_score: parseInt(result.home),
        away_score: parseInt(result.away),
      }),
    })
    const data = await res.json()
    setMessage(res.ok ? `Resultado salvo. ${data.updated} palpites pontuados.` : `Erro: ${data.error}`)
    fetchGames()
  }

  const game = games.find(g => g.id === selectedGame)

  return (
    <main className="min-h-screen text-slate-100 px-4 py-6 relative" style={{backgroundImage: 'url(/bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed'}}>
      <div className="absolute inset-0 bg-[#020617]/85 backdrop-blur-sm" />
      <div className="relative z-10">
      <nav className="mb-8 flex items-center justify-between">
        <span className="font-bold text-slate-100 tracking-tight">
          K7 <span className="text-emerald-400">BET</span>
          <span className="text-slate-600 font-normal ml-2 text-sm">· Admin</span>
        </span>
        <a href="/jogos" className="text-sm text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
          Voltar
        </a>
      </nav>

      <div className="max-w-2xl mx-auto space-y-4">
        {message && (
          <p className="text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-900 rounded-xl px-4 py-2.5">
            {message}
          </p>
        )}

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="font-semibold text-slate-100 text-sm mb-1">Importar Jogos</h2>
          <p className="text-xs text-slate-500 mb-4">Busca os jogos da Copa 2026 em football-data.org e atualiza o banco.</p>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleImport}
              disabled={importing}
              className="bg-slate-700 text-slate-100 rounded-xl px-4 py-2 text-sm hover:bg-slate-600 disabled:opacity-40 transition-colors cursor-pointer"
            >
              {importing ? 'Importando...' : 'Importar da API'}
            </button>
            <button
              onClick={handleSyncResults}
              disabled={syncing}
              className="bg-emerald-700 text-slate-100 rounded-xl px-4 py-2 text-sm hover:bg-emerald-600 disabled:opacity-40 transition-colors cursor-pointer"
            >
              {syncing ? 'Sincronizando...' : 'Sincronizar Resultados'}
            </button>
            <button
              onClick={handleFixOrphanBets}
              disabled={fixing}
              className="bg-amber-600 text-slate-100 rounded-xl px-4 py-2 text-sm hover:bg-amber-500 disabled:opacity-40 transition-colors cursor-pointer"
            >
              {fixing ? 'Corrigindo...' : 'Corrigir Apostas Órfãs'}
            </button>
            <button
              onClick={handleFixNullScores}
              disabled={fixingScores}
              className="bg-violet-700 text-slate-100 rounded-xl px-4 py-2 text-sm hover:bg-violet-600 disabled:opacity-40 transition-colors cursor-pointer"
            >
              {fixingScores ? 'Corrigindo...' : 'Corrigir Placares Nulos'}
            </button>
          </div>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="font-semibold text-slate-100 text-sm mb-3">Selecionar Jogo</h2>
          <select
            value={selectedGame}
            onChange={e => setSelectedGame(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
          >
            <option value="">-- Selecione um jogo --</option>
            {games.map(g => (
              <option key={g.id} value={g.id}>
                {g.home_team} × {g.away_team} · {new Date(g.kickoff_at).toLocaleDateString('pt-BR')} · [{g.status}]
              </option>
            ))}
          </select>
        </section>

        {selectedGame && (
          <>
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="font-semibold text-slate-100 text-sm mb-3">
                Odds — {game?.home_team} × {game?.away_team}
              </h2>
              <div className="flex gap-3">
                {[
                  { key: 'home' as const, label: game?.home_team ?? 'Casa' },
                  { key: 'draw' as const, label: 'Empate' },
                  { key: 'away' as const, label: game?.away_team ?? 'Fora' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex-1">
                    <label className="text-xs text-slate-500 block mb-1.5">{label}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={odds[key]}
                      onChange={e => setOdds(o => ({ ...o, [key]: e.target.value }))}
                      placeholder={key === 'home' ? game?.home_odds?.toString() : key === 'draw' ? game?.draw_odds?.toString() : game?.away_odds?.toString()}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 transition-colors tabular-nums"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={handleSaveOdds}
                className="mt-3 bg-amber-500 text-black rounded-xl px-4 py-1.5 text-sm font-semibold hover:bg-amber-400 transition-colors cursor-pointer"
              >
                Salvar Odds
              </button>
            </section>

            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-100 text-sm">
                  Escalação — {game?.home_team} × {game?.away_team}
                </h2>
                <button
                  onClick={handleFetchLineup}
                  disabled={loadingLineup}
                  className="bg-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-xs hover:bg-slate-600 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  {loadingLineup ? 'Buscando...' : 'Buscar Escalação'}
                </button>
              </div>
              <p className="text-xs text-slate-600 mb-3">Disponível ~1h antes do kickoff via API-Football.</p>
              {lineupError && <p className="text-xs text-red-400">{lineupError}</p>}
              {lineup && (
                <div className="grid grid-cols-2 gap-4">
                  {(['home', 'away'] as const).map(side => {
                    const team = lineup[side]
                    return (
                      <div key={side}>
                        <p className="text-xs font-semibold text-amber-400 mb-2">{team.team} · {team.formation}</p>
                        <div className="space-y-0.5">
                          {team.startXI.map(p => (
                            <div key={p.number} className="flex gap-2 text-xs text-slate-300">
                              <span className="text-slate-600 w-4 text-right tabular-nums">{p.number}</span>
                              <span className="text-slate-500 w-4">{p.position}</span>
                              <span>{p.name}</span>
                            </div>
                          ))}
                        </div>
                        {team.substitutes.length > 0 && (
                          <>
                            <p className="text-xs text-slate-600 mt-2 mb-1">Banco</p>
                            <div className="space-y-0.5">
                              {team.substitutes.map(p => (
                                <div key={p.number} className="flex gap-2 text-xs text-slate-600">
                                  <span className="w-4 text-right tabular-nums">{p.number}</span>
                                  <span className="w-4">{p.position}</span>
                                  <span>{p.name}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="font-semibold text-slate-100 text-sm mb-1">
                {game?.status === 'finished' ? 'Corrigir Resultado' : 'Inserir Resultado'}
              </h2>
              {game?.status === 'finished' && (
                <p className="text-xs text-amber-400 mb-3">
                  Placar atual: {game.home_score ?? '?'} × {game.away_score ?? '?'} — preencha abaixo para corrigir.
                </p>
              )}
              <div className="flex items-end gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1.5">{game?.home_team}</label>
                  <input
                    type="number"
                    min={0}
                    value={result.home}
                    onChange={e => setResult(r => ({ ...r, home: e.target.value }))}
                    className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-slate-100 text-center text-sm focus:outline-none focus:border-emerald-500 transition-colors tabular-nums"
                  />
                </div>
                <span className="text-slate-600 mb-2 text-sm">×</span>
                <div>
                  <label className="text-xs text-slate-500 block mb-1.5">{game?.away_team}</label>
                  <input
                    type="number"
                    min={0}
                    value={result.away}
                    onChange={e => setResult(r => ({ ...r, away: e.target.value }))}
                    className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-slate-100 text-center text-sm focus:outline-none focus:border-emerald-500 transition-colors tabular-nums"
                  />
                </div>
                <button
                  onClick={handleSaveResult}
                  className={`text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${game?.status === 'finished' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-red-600 hover:bg-red-500'}`}
                >
                  {game?.status === 'finished' ? 'Corrigir Placar' : 'Finalizar Jogo'}
                </button>
              </div>
            </section>
          </>
        )}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="font-semibold text-slate-100 text-sm mb-1">Resultado do Torneio</h2>
          <p className="text-xs text-slate-500 mb-4">Define campeão, vice e artilheiro — pontos são calculados automaticamente.</p>
          <div className="space-y-3">
            {([
              { key: 'champion' as const, label: 'Campeão' },
              { key: 'runner_up' as const, label: 'Vice-campeão' },
              { key: 'top_scorer' as const, label: 'Artilheiro' },
            ]).map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs text-slate-500 block mb-1.5">{label}</label>
                <input
                  type="text"
                  value={tournamentResult[key]}
                  onChange={e => setTournamentResult(r => ({ ...r, [key]: e.target.value }))}
                  placeholder={`Nome do ${label.toLowerCase()}`}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            ))}
          </div>
          <button
            onClick={handleSaveTournamentResult}
            disabled={savingTournament}
            className="mt-4 bg-purple-700 text-slate-100 rounded-xl px-4 py-2 text-sm hover:bg-purple-600 disabled:opacity-40 transition-colors cursor-pointer"
          >
            {savingTournament ? 'Salvando...' : 'Salvar Resultado do Torneio'}
          </button>
        </section>
      </div>
      </div>
    </main>
  )
}
