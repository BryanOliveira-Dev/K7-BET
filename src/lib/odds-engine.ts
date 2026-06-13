// Odds auto-geradas baseadas em ranking FIFA (mai/2026) + histórico em Copas
// Admin pode sobrescrever manualmente no painel

export interface TeamOdds {
  home_odds: number
  draw_odds: number
  away_odds: number
}

// Força relativa 0–100 baseada em ranking FIFA + desempenho histórico
const TEAM_STRENGTH: Record<string, number> = {
  // Elite
  Argentina: 98,
  France: 96,
  Spain: 94,
  England: 91,
  Brazil: 93,
  Portugal: 88,
  Germany: 87,
  Netherlands: 86,
  Belgium: 82,
  Italy: 83,
  Uruguay: 80,
  Colombia: 79,

  // Fortes
  Croatia: 78,
  Denmark: 77,
  Switzerland: 76,
  Mexico: 75,
  'United States': 74,
  USA: 74,
  Senegal: 73,
  Morocco: 72,
  Japan: 71,
  Ecuador: 70,
  Serbia: 69,
  Poland: 68,
  Cameroon: 67,
  Australia: 66,
  Iran: 65,
  'South Korea': 64,
  Tunisia: 63,
  Wales: 62,
  Slovakia: 62,
  Austria: 61,

  // Médios
  Turkey: 60,
  Hungary: 59,
  Ukraine: 58,
  Romania: 57,
  Greece: 56,
  Sweden: 55,
  Czech: 55,
  'Czech Republic': 55,
  'Czechia': 55,
  Norway: 54,
  Scotland: 53,
  Algeria: 52,
  Egypt: 51,
  Nigeria: 50,
  Ghana: 49,
  'Ivory Coast': 48,
  "Côte d'Ivoire": 48,
  Mali: 47,
  'Saudi Arabia': 46,
  Qatar: 45,
  Canada: 44,
  'Costa Rica': 43,
  Panama: 42,
  Honduras: 41,
  Jamaica: 40,
  'El Salvador': 39,
  Cuba: 38,
  'Curacao': 37,

  // Demais qualificados
  Venezuela: 46,
  Bolivia: 40,
  Chile: 55,
  Paraguay: 48,
  Peru: 45,
  'New Zealand': 40,
  Fiji: 30,
  Tahiti: 25,
  Indonesia: 35,
  Iraq: 45,
  Jordan: 42,
  Bahrain: 38,
  Oman: 36,
  Uganda: 42,
  Congo: 41,
  'DR Congo': 43,
  Tanzania: 38,
  Zambia: 37,
  Mozambique: 33,
  Zimbabwe: 34,
  Angola: 36,
  'New Caledonia': 28,
  Vanuatu: 22,
  Albania: 52,
  Slovenia: 53,
  Georgia: 54,
  Kosovo: 48,
  Armenia: 44,
  Azerbaijan: 40,
  'North Macedonia': 46,
  Finland: 50,
  Iceland: 53,
  Ireland: 49,
  'Northern Ireland': 46,
  Luxembourg: 43,
  Gibraltar: 18,
  'San Marino': 10,
  Liechtenstein: 12,
}

const DEFAULT_STRENGTH = 40

function getStrength(team: string): number {
  if (TEAM_STRENGTH[team] !== undefined) return TEAM_STRENGTH[team]
  // Busca parcial case-insensitive
  const key = Object.keys(TEAM_STRENGTH).find(
    (k) => k.toLowerCase() === team.toLowerCase()
  )
  return key ? TEAM_STRENGTH[key] : DEFAULT_STRENGTH
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// Converte diferença de força em odds decimais (estilo europeu)
// Baseado em modelo logístico simples + margem da casa (~8%)
export function calculateOdds(homeTeam: string, awayTeam: string): TeamOdds {
  const h = getStrength(homeTeam)
  const a = getStrength(awayTeam)

  const diff = h - a
  // Probabilidades brutas (sem margem)
  // Modelado empiricamente para diferenças típicas em Copas
  let pHome: number
  let pDraw: number
  let pAway: number

  if (diff >= 40) {
    pHome = 0.70; pDraw = 0.18; pAway = 0.12
  } else if (diff >= 30) {
    pHome = 0.62; pDraw = 0.21; pAway = 0.17
  } else if (diff >= 20) {
    pHome = 0.54; pDraw = 0.24; pAway = 0.22
  } else if (diff >= 10) {
    pHome = 0.46; pDraw = 0.26; pAway = 0.28
  } else if (diff >= 0) {
    pHome = 0.40; pDraw = 0.28; pAway = 0.32
  } else if (diff >= -10) {
    pHome = 0.32; pDraw = 0.26; pAway = 0.42
  } else if (diff >= -20) {
    pHome = 0.24; pDraw = 0.24; pAway = 0.52
  } else if (diff >= -30) {
    pHome = 0.18; pDraw = 0.21; pAway = 0.61
  } else {
    pHome = 0.13; pDraw = 0.18; pAway = 0.69
  }

  // Margem de 8% distribuída igualmente (simula bookmaker)
  const margin = 1.08
  const homeOdds = round2(Math.min(margin / pHome, 12.0))
  const drawOdds = round2(Math.min(margin / pDraw, 8.0))
  const awayOdds = round2(Math.min(margin / pAway, 12.0))

  // Limita odds mínimas a 1.10 (evita favorito absoluto irreal)
  return {
    home_odds: Math.max(homeOdds, 1.10),
    draw_odds: Math.max(drawOdds, 1.10),
    away_odds: Math.max(awayOdds, 1.10),
  }
}
