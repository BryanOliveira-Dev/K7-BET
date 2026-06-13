import type { BetResult } from './types'

interface GameScores {
  home_score: number | null
  away_score: number | null
  home_odds: number | null
  away_odds: number | null
  draw_odds: number | null
}

interface BetInput {
  predicted_result: BetResult
  predicted_home_score: number | null
  predicted_away_score: number | null
}

function getActualResult(homeScore: number, awayScore: number): BetResult {
  if (homeScore > awayScore) return 'home'
  if (awayScore > homeScore) return 'away'
  return 'draw'
}

function getOddsBonus(odds: number | null): number {
  if (odds === null || odds < 2.0) return 0
  if (odds < 3.0) return 1
  if (odds < 4.0) return 2
  return 3
}

export function calculatePoints(bet: BetInput, game: GameScores): number {
  if (game.home_score === null || game.away_score === null) return 0

  const actualResult = getActualResult(game.home_score, game.away_score)
  if (bet.predicted_result !== actualResult) return 0

  const isExactScore =
    bet.predicted_home_score === game.home_score &&
    bet.predicted_away_score === game.away_score

  const basePoints = isExactScore ? 3 : 1

  let bonus = 0
  if (bet.predicted_result === 'home') bonus = getOddsBonus(game.home_odds)
  else if (bet.predicted_result === 'away') bonus = getOddsBonus(game.away_odds)
  else if (bet.predicted_result === 'draw') bonus = getOddsBonus(game.draw_odds)

  return basePoints + bonus
}
