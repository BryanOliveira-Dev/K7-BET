export type GamePhase = 'group' | 'r16' | 'qf' | 'sf' | 'final'
export type GameStatus = 'scheduled' | 'live' | 'finished'
export type BetResult = 'home' | 'draw' | 'away'

export interface User {
  id: string
  name: string
  session_token: string
  is_admin: boolean
  created_at: string
}

export interface Game {
  id: string
  api_id: string | null
  home_team: string
  away_team: string
  home_flag: string | null
  away_flag: string | null
  kickoff_at: string
  phase: GamePhase
  group_name: string | null
  home_odds: number | null
  away_odds: number | null
  draw_odds: number | null
  home_score: number | null
  away_score: number | null
  status: GameStatus
}

export interface Bet {
  id: string
  user_id: string
  game_id: string
  predicted_result: BetResult
  predicted_home_score: number | null
  predicted_away_score: number | null
  points_earned: number
  created_at: string
}

export interface OtherBet {
  user_id: string
  predicted_result: BetResult
  predicted_home_score: number | null
  predicted_away_score: number | null
  points_earned: number
  users: { name: string } | null
}

export interface RankingEntry {
  user_id: string
  name: string
  total_points: number
  correct_results: number
}

export interface GameWithBet extends Game {
  my_bet: Bet | null
}

export interface Session {
  userId: string
  name: string
  isAdmin: boolean
}
