// Wrapper para api-football.com (v3)
// Cadastro gratuito em https://www.api-football.com — 100 req/dia no plano free
// Variável de ambiente: APIFOOTBALL_KEY

const BASE = 'https://v3.football.api-sports.io'
const WORLD_CUP_LEAGUE = 1   // FIFA World Cup
const SEASON = 2026

interface ApiFixture {
  fixture: { id: number; date: string }
  teams: {
    home: { id: number; name: string }
    away: { id: number; name: string }
  }
}

interface ApiLineupPlayer {
  player: { id: number; name: string; number: number; pos: string }
  statistics?: unknown[]
}

interface ApiLineup {
  team: { id: number; name: string }
  formation: string
  startXI: ApiLineupPlayer[]
  substitutes: ApiLineupPlayer[]
}

function headers() {
  const key = process.env.APIFOOTBALL_KEY
  if (!key) throw new Error('APIFOOTBALL_KEY não configurada')
  return { 'x-apisports-key': key }
}

async function get<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const url = new URL(`${BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
  const res = await fetch(url.toString(), { headers: headers(), next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`API-Football erro ${res.status}`)
  const json = await res.json()
  return json.response as T
}

// Normaliza nome para comparação tolerante a acentos e variações
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function nameMatch(a: string, b: string): boolean {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  return na === nb || na.includes(nb) || nb.includes(na)
}

// Busca o fixture ID da API-Football pelo nome dos times + data
export async function findFixtureId(
  homeTeam: string,
  awayTeam: string,
  kickoffAt: string
): Promise<number | null> {
  const date = kickoffAt.slice(0, 10) // YYYY-MM-DD
  const fixtures = await get<ApiFixture[]>('/fixtures', {
    league: WORLD_CUP_LEAGUE,
    season: SEASON,
    date,
  })

  const match = fixtures.find(
    (f) =>
      nameMatch(f.teams.home.name, homeTeam) &&
      nameMatch(f.teams.away.name, awayTeam)
  )

  return match?.fixture.id ?? null
}

export interface LineupData {
  home: {
    team: string
    formation: string
    startXI: { name: string; number: number; position: string }[]
    substitutes: { name: string; number: number; position: string }[]
  }
  away: {
    team: string
    formation: string
    startXI: { name: string; number: number; position: string }[]
    substitutes: { name: string; number: number; position: string }[]
  }
}

function mapPlayers(players: ApiLineupPlayer[]) {
  return players.map((p) => ({
    name: p.player.name,
    number: p.player.number,
    position: p.player.pos,
  }))
}

export async function fetchLineup(fixtureId: number): Promise<LineupData | null> {
  const lineups = await get<ApiLineup[]>('/fixtures/lineups', { fixture: fixtureId })
  if (!lineups || lineups.length < 2) return null

  const [home, away] = lineups
  return {
    home: {
      team: home.team.name,
      formation: home.formation,
      startXI: mapPlayers(home.startXI),
      substitutes: mapPlayers(home.substitutes),
    },
    away: {
      team: away.team.name,
      formation: away.formation,
      startXI: mapPlayers(away.startXI),
      substitutes: mapPlayers(away.substitutes),
    },
  }
}
