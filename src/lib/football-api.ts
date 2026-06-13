const BASE_URL = 'https://api.football-data.org/v4'

interface ApiTeam {
  id: number
  name: string
  shortName: string
  crest: string
}

interface ApiScore {
  fullTime: { home: number | null; away: number | null }
}

interface ApiMatch {
  id: number
  utcDate: string
  status: string
  stage: string
  group: string | null
  homeTeam: ApiTeam
  awayTeam: ApiTeam
  score: ApiScore
}

export interface ImportedGame {
  api_id: string
  home_team: string
  away_team: string
  home_flag: string
  away_flag: string
  kickoff_at: string
  phase: string
  group_name: string | null
}

export interface FinishedGameResult {
  api_id: string
  home_score: number
  away_score: number
}

const STAGE_MAP: Record<string, string> = {
  GROUP_STAGE: 'group',
  ROUND_OF_16: 'r16',
  QUARTER_FINALS: 'qf',
  SEMI_FINALS: 'sf',
  FINAL: 'final',
}

export async function fetchWorldCupGames(): Promise<ImportedGame[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout

  let res: Response
  try {
    res = await fetch(`${BASE_URL}/competitions/WC/matches?season=2026`, {
      headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY ?? '' },
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeout)
    throw new Error(`Timeout ou falha de conexão com football-data.org: ${err}`)
  }
  clearTimeout(timeout)

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`football-data.org erro ${res.status}: ${body.slice(0, 200)}`)
  }

  const data = await res.json()
  const matches: ApiMatch[] = data.matches ?? []

  return matches
    .filter(m => m.homeTeam?.name && m.awayTeam?.name) // ignora jogos sem times definidos
    .map(m => ({
      api_id: String(m.id),
      home_team: m.homeTeam.shortName || m.homeTeam.name,
      away_team: m.awayTeam.shortName || m.awayTeam.name,
      home_flag: m.homeTeam.crest ?? '',
      away_flag: m.awayTeam.crest ?? '',
      kickoff_at: m.utcDate,
      phase: STAGE_MAP[m.stage] ?? 'group',
      group_name: m.group ? m.group.replace('GROUP_', '') : null,
    }))
}

export async function fetchFinishedResults(): Promise<FinishedGameResult[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  let res: Response
  try {
    res = await fetch(`${BASE_URL}/competitions/WC/matches?season=2026&status=FINISHED`, {
      headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY ?? '' },
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeout)
    throw new Error(`Timeout ou falha de conexão: ${err}`)
  }
  clearTimeout(timeout)

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`football-data.org erro ${res.status}: ${body.slice(0, 200)}`)
  }

  const data = await res.json()
  const matches: ApiMatch[] = data.matches ?? []

  return matches
    .filter(m => m.status === 'FINISHED' && m.score?.fullTime?.home != null && m.score?.fullTime?.away != null)
    .map(m => ({
      api_id: String(m.id),
      home_score: m.score.fullTime.home as number,
      away_score: m.score.fullTime.away as number,
    }))
}
