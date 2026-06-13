'use client'

import { useState } from 'react'
import CountdownTimer from './CountdownTimer'
import BetForm from './BetForm'
import type { Game, Bet, OtherBet } from '@/lib/types'

interface Props {
  game: Game & { my_bet: Bet | null; bets_open: boolean }
  otherBets: OtherBet[]
  onBetSaved: () => void
}

const PHASE_LABELS: Record<string, string> = {
  group: 'Grupos',
  r16: 'Oitavas',
  qf: 'Quartas',
  sf: 'Semifinal',
  final: 'Final',
}

const RESULT_LABELS: Record<string, string> = {
  home: 'Casa',
  draw: 'Empate',
  away: 'Fora',
}

const RESULT_COLORS: Record<string, string> = {
  home: 'text-blue-400',
  draw: 'text-slate-400',
  away: 'text-orange-400',
}

export default function GameCard({ game, otherBets, onBetSaved }: Props) {
  const [expanded, setExpanded] = useState(false)
  const kickoff = new Date(game.kickoff_at)

  const isFinished = game.status === 'finished'
  const isLive = game.status === 'live'
  const canBet = game.bets_open && game.status === 'scheduled'

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-colors">
      <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
        <span className="font-medium">
          {PHASE_LABELS[game.phase]}{game.group_name ? ` · Grupo ${game.group_name}` : ''}
        </span>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1 text-red-400 font-semibold">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse inline-block" />
              Ao vivo
            </span>
          )}
          {!isLive && (
            <span>{kickoff.toLocaleDateString('pt-BR')} · {kickoff.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          )}
        </div>
      </div>

      <div className="flex items-center">
        <div className="text-center flex-1">
          {game.home_flag && <img src={game.home_flag} alt={game.home_team} className="w-9 h-9 mx-auto mb-2 object-contain" />}
          <div className="text-slate-100 text-sm font-semibold">{game.home_team}</div>
          {game.home_odds && (
            <div className="text-xs text-slate-500 mt-1 tabular-nums">{game.home_odds.toFixed(2)}</div>
          )}
        </div>

        <div className="px-6 text-center min-w-[80px]">
          {isFinished ? (
            <div className="text-amber-400 font-bold text-2xl tabular-nums tracking-tight">
              {game.home_score} &ndash; {game.away_score}
            </div>
          ) : (
            <>
              <div className="text-slate-600 font-medium text-sm mb-0.5">VS</div>
              <CountdownTimer kickoffAt={game.kickoff_at} />
            </>
          )}
          {!isLive && !isFinished && (
            <div className={`text-xs mt-1.5 font-medium ${canBet ? 'text-emerald-400' : 'text-slate-600'}`}>
              {canBet ? 'Aberto' : 'Fechado'}
            </div>
          )}
          {isFinished && (
            <div className="text-xs mt-1 text-slate-600">Finalizado</div>
          )}
        </div>

        <div className="text-center flex-1">
          {game.away_flag && <img src={game.away_flag} alt={game.away_team} className="w-9 h-9 mx-auto mb-2 object-contain" />}
          <div className="text-slate-100 text-sm font-semibold">{game.away_team}</div>
          {game.away_odds && (
            <div className="text-xs text-slate-500 mt-1 tabular-nums">{game.away_odds.toFixed(2)}</div>
          )}
        </div>
      </div>

      {game.my_bet && (
        <div className="mt-4 border-t border-slate-800 pt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Seu palpite:{' '}
              <span className="text-slate-300 font-medium">{RESULT_LABELS[game.my_bet.predicted_result]}</span>
              {game.my_bet.predicted_home_score != null && (
                <span className="text-slate-500 ml-1 tabular-nums">· {game.my_bet.predicted_home_score}×{game.my_bet.predicted_away_score}</span>
              )}
            </span>
            {isFinished && (
              <span className={`font-bold tabular-nums ${game.my_bet.points_earned > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                {game.my_bet.points_earned > 0 ? `+${game.my_bet.points_earned} pts` : '0 pts'}
              </span>
            )}
          </div>
        </div>
      )}

      {!canBet && otherBets.length > 0 && (
        <div className="mt-4 border-t border-slate-800 pt-3">
          <p className="text-xs text-slate-500 font-medium mb-2.5">Palpites dos jogadores</p>
          <div className="space-y-1.5">
            {otherBets.map((bet, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">{bet.users?.name ?? 'Anônimo'}</span>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${RESULT_COLORS[bet.predicted_result]}`}>
                    {RESULT_LABELS[bet.predicted_result]}
                  </span>
                  {bet.predicted_home_score != null && (
                    <span className="text-slate-600 tabular-nums">{bet.predicted_home_score}×{bet.predicted_away_score}</span>
                  )}
                  {isFinished && (
                    <span className={`font-bold tabular-nums ${bet.points_earned > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {bet.points_earned > 0 ? `+${bet.points_earned}` : '0'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {canBet && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-emerald-500 hover:text-emerald-400 font-medium transition-colors cursor-pointer"
          >
            {expanded ? 'Fechar' : game.my_bet ? 'Editar palpite' : 'Fazer palpite'}
          </button>
          {expanded && (
            <BetForm
              gameId={game.id}
              homeTeam={game.home_team}
              awayTeam={game.away_team}
              homeOdds={game.home_odds}
              awayOdds={game.away_odds}
              drawOdds={game.draw_odds}
              existingBet={game.my_bet}
              onSuccess={() => { setExpanded(false); onBetSaved() }}
            />
          )}
        </div>
      )}
    </div>
  )
}
