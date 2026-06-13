import { describe, it, expect } from 'vitest'
import { calculatePoints } from '@/lib/points'

const baseGame = {
  home_score: 2,
  away_score: 1,
  home_odds: 1.45,
  away_odds: 3.20,
  draw_odds: 3.50,
}

describe('calculatePoints', () => {
  it('retorna 0 quando resultado errado', () => {
    const bet = { predicted_result: 'away' as const, predicted_home_score: null, predicted_away_score: null }
    expect(calculatePoints(bet, baseGame)).toBe(0)
  })

  it('retorna 0 quando empate errado', () => {
    const bet = { predicted_result: 'draw' as const, predicted_home_score: null, predicted_away_score: null }
    expect(calculatePoints(bet, baseGame)).toBe(0)
  })

  it('retorna 1 para resultado certo sem placar (favorito)', () => {
    const bet = { predicted_result: 'home' as const, predicted_home_score: null, predicted_away_score: null }
    expect(calculatePoints(bet, baseGame)).toBe(1) // odds 1.45 < 2.0, sem bônus
  })

  it('retorna 3 para placar exato (favorito)', () => {
    const bet = { predicted_result: 'home' as const, predicted_home_score: 2, predicted_away_score: 1 }
    expect(calculatePoints(bet, baseGame)).toBe(3) // odds 1.45 < 2.0, sem bônus
  })

  it('retorna placar errado mas resultado certo = 1pt', () => {
    const bet = { predicted_result: 'home' as const, predicted_home_score: 3, predicted_away_score: 0 }
    expect(calculatePoints(bet, baseGame)).toBe(1)
  })

  it('bônus +1pt para odds 2.0-2.9 com resultado certo', () => {
    const game = { ...baseGame, home_score: 0, away_score: 1, away_odds: 2.5 }
    const bet = { predicted_result: 'away' as const, predicted_home_score: null, predicted_away_score: null }
    expect(calculatePoints(bet, game)).toBe(2) // 1 base + 1 bônus
  })

  it('bônus +2pt para odds 3.0-3.9 com resultado certo', () => {
    const game = { ...baseGame, home_score: 0, away_score: 1 } // away_odds = 3.20
    const bet = { predicted_result: 'away' as const, predicted_home_score: null, predicted_away_score: null }
    expect(calculatePoints(bet, game)).toBe(3) // 1 base + 2 bônus
  })

  it('bônus +3pt para odds >= 4.0 com resultado certo', () => {
    const game = { ...baseGame, home_score: 0, away_score: 1, away_odds: 4.50 }
    const bet = { predicted_result: 'away' as const, predicted_home_score: null, predicted_away_score: null }
    expect(calculatePoints(bet, game)).toBe(4) // 1 base + 3 bônus
  })

  it('bônus +3pt + placar exato = 6pts total', () => {
    const game = { ...baseGame, home_score: 0, away_score: 2, away_odds: 4.50 }
    const bet = { predicted_result: 'away' as const, predicted_home_score: 0, predicted_away_score: 2 }
    expect(calculatePoints(bet, game)).toBe(6) // 3 placar + 3 bônus
  })

  it('empate não recebe bônus de odds', () => {
    const game = { ...baseGame, home_score: 1, away_score: 1, draw_odds: 5.0 }
    const bet = { predicted_result: 'draw' as const, predicted_home_score: null, predicted_away_score: null }
    expect(calculatePoints(bet, game)).toBe(1) // 1 base, sem bônus
  })

  it('empate com placar exato = 3pts sem bônus', () => {
    const game = { ...baseGame, home_score: 1, away_score: 1, draw_odds: 5.0 }
    const bet = { predicted_result: 'draw' as const, predicted_home_score: 1, predicted_away_score: 1 }
    expect(calculatePoints(bet, game)).toBe(3) // 3 placar, sem bônus
  })

  it('retorna 0 quando scores do jogo são null (jogo não finalizado)', () => {
    const game = { ...baseGame, home_score: null, away_score: null }
    const bet = { predicted_result: 'home' as const, predicted_home_score: null, predicted_away_score: null }
    expect(calculatePoints(bet, game)).toBe(0)
  })
})
