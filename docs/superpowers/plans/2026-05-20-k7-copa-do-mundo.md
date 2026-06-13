# K7 Copa do Mundo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir um site privado de palpites da Copa do Mundo 2026 com sistema de pontos baseado em odds, acesso por senha compartilhada e ranking em tempo real.

**Architecture:** Next.js 14 App Router + Supabase (PostgreSQL + Realtime). Auth via senha compartilhada + cookie httpOnly. Pontuação calculada no servidor quando admin insere resultado. Dados de jogos importados de football-data.org; odds definidas manualmente no admin.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Supabase, Vitest, Vercel.

---

## Estrutura de Arquivos

```
src/
  app/
    page.tsx                        # Página de login
    jogos/
      page.tsx                      # Lista de partidas + palpites
    ranking/
      page.tsx                      # Tabela de pontuação (realtime)
    admin/
      page.tsx                      # Painel de administração
    api/
      auth/
        route.ts                    # POST login, DELETE logout
      bets/
        route.ts                    # GET palpites do user, POST novo palpite
      games/
        route.ts                    # GET lista de jogos (com palpite do user)
      admin/
        import-games/route.ts       # POST importar da football-data.org
        odds/route.ts               # PATCH atualizar odds de um jogo
        results/route.ts            # POST inserir resultado + calcular pontos
  lib/
    types.ts                        # Interfaces TypeScript
    supabase.ts                     # Supabase server client
    supabase-browser.ts             # Supabase browser client (realtime)
    auth.ts                         # Helpers de sessão e validação
    points.ts                       # Lógica de cálculo de pontos (pura)
    football-api.ts                 # Wrapper football-data.org
  components/
    GameCard.tsx                    # Card de uma partida com form de palpite
    BetForm.tsx                     # Formulário inline de palpite
    RankingTable.tsx                # Tabela de ranking com realtime
    CountdownTimer.tsx              # Contagem regressiva até o jogo
  middleware.ts                     # Proteção de rotas
tests/
  lib/
    points.test.ts                  # Testes unitários da lógica de pontos
    auth.test.ts                    # Testes de validação de sessão
```

---

## Task 1: Setup do Projeto

**Files:**
- Create: `package.json`, `tsconfig.json`, `.env.local.example`, `vitest.config.ts`

- [ ] **Step 1: Criar app Next.js**

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --no-eslint --import-alias "@/*"
```

Responda: Yes para TypeScript, Yes para Tailwind, Yes para App Router, Yes para src/.

- [ ] **Step 2: Instalar dependências**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Configurar Vitest**

Criar `vitest.config.ts` na raiz:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

- [ ] **Step 4: Criar setup de testes**

Criar `tests/setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Criar .env.local.example**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
GROUP_PASSWORD=senha_do_grupo
ADMIN_PASSWORD=senha_admin_forte
FOOTBALL_API_KEY=sua_chave_football_data_org
```

Copie para `.env.local` e preencha com os valores reais.

- [ ] **Step 6: Adicionar script de testes ao package.json**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 7: Rodar dev para confirmar setup**

```bash
npm run dev
```

Esperado: servidor rodando em `http://localhost:3000` sem erros.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: initial Next.js setup with Supabase and Vitest"
```

---

## Task 2: Schema do Supabase

**Files:**
- Create: `supabase/schema.sql`

- [ ] **Step 1: Criar o arquivo de schema**

Criar `supabase/schema.sql`:

```sql
-- Habilitar extensão UUID
create extension if not exists "pgcrypto";

-- Participantes
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  session_token text not null,
  created_at    timestamptz default now()
);

-- Partidas
create table if not exists games (
  id            uuid primary key default gen_random_uuid(),
  api_id        text unique,
  home_team     text not null,
  away_team     text not null,
  home_flag     text,
  away_flag     text,
  kickoff_at    timestamptz not null,
  phase         text not null check (phase in ('group','r16','qf','sf','final')),
  group_name    text,
  home_odds     numeric(4,2),
  away_odds     numeric(4,2),
  draw_odds     numeric(4,2),
  home_score    int,
  away_score    int,
  status        text not null default 'scheduled'
                check (status in ('scheduled','live','finished'))
);

create index if not exists games_kickoff_idx on games(kickoff_at);

-- Palpites
create table if not exists bets (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references users(id),
  game_id              uuid not null references games(id),
  predicted_result     text not null check (predicted_result in ('home','draw','away')),
  predicted_home_score int,
  predicted_away_score int,
  points_earned        int not null default 0,
  created_at           timestamptz default now(),
  unique(user_id, game_id)
);

create index if not exists bets_game_idx on bets(game_id);
create index if not exists bets_user_idx on bets(user_id);

-- RLS: desabilitar (acesso controlado pelo service role na API)
alter table users disable row level security;
alter table games disable row level security;
alter table bets disable row level security;
```

- [ ] **Step 2: Executar no Supabase**

1. Acesse seu projeto em `supabase.com`
2. Vá em **SQL Editor**
3. Cole o conteúdo de `supabase/schema.sql` e execute

Confirmar: tabelas `users`, `games`, `bets` aparecem em **Table Editor**.

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add Supabase database schema"
```

---

## Task 3: Tipos TypeScript + Supabase Clients

**Files:**
- Create: `src/lib/types.ts`, `src/lib/supabase.ts`, `src/lib/supabase-browser.ts`

- [ ] **Step 1: Criar tipos compartilhados**

Criar `src/lib/types.ts`:

```typescript
export type GamePhase = 'group' | 'r16' | 'qf' | 'sf' | 'final'
export type GameStatus = 'scheduled' | 'live' | 'finished'
export type BetResult = 'home' | 'draw' | 'away'

export interface User {
  id: string
  name: string
  session_token: string
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
```

- [ ] **Step 2: Criar Supabase server client**

Criar `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
```

- [ ] **Step 3: Criar Supabase browser client**

Criar `src/lib/supabase-browser.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

let client: ReturnType<typeof createClient> | null = null

export function createBrowserClient() {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return client
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/
git commit -m "feat: add TypeScript types and Supabase clients"
```

---

## Task 4: Lógica de Pontos (TDD)

**Files:**
- Create: `src/lib/points.ts`, `tests/lib/points.test.ts`

- [ ] **Step 1: Escrever os testes antes da implementação**

Criar `tests/lib/points.test.ts`:

```typescript
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
    expect(calculatePoints(bet, game as any)).toBe(0)
  })
})
```

- [ ] **Step 2: Rodar para confirmar FALHA**

```bash
npm test tests/lib/points.test.ts
```

Esperado: erro `Cannot find module '@/lib/points'`

- [ ] **Step 3: Implementar a lógica de pontos**

Criar `src/lib/points.ts`:

```typescript
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
  // draw: sem bônus

  return basePoints + bonus
}
```

- [ ] **Step 4: Rodar para confirmar PASS**

```bash
npm test tests/lib/points.test.ts
```

Esperado: `11 tests passed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/points.ts tests/lib/points.test.ts
git commit -m "feat: add points calculation logic with full test coverage"
```

---

## Task 5: Sistema de Auth

**Files:**
- Create: `src/lib/auth.ts`, `src/middleware.ts`, `src/app/api/auth/route.ts`, `src/app/page.tsx`

- [ ] **Step 1: Criar helpers de auth**

Criar `src/lib/auth.ts`:

```typescript
import { cookies } from 'next/headers'
import { createServerClient } from './supabase'
import type { Session } from './types'
import { randomUUID } from 'crypto'

const SESSION_COOKIE = 'k7_session'
const ADMIN_COOKIE = 'k7_admin'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 dias

export async function getSession(): Promise<Session | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null

  const supabase = createServerClient()
  const { data } = await supabase
    .from('users')
    .select('id, name')
    .eq('session_token', token)
    .single()

  if (!data) return null

  const isAdmin = store.get(ADMIN_COOKIE)?.value === process.env.ADMIN_PASSWORD

  return { userId: data.id, name: data.name, isAdmin }
}

export async function loginUser(name: string): Promise<void> {
  const token = randomUUID()
  const supabase = createServerClient()

  await supabase.from('users').upsert(
    { name, session_token: token },
    { onConflict: 'name', ignoreDuplicates: false }
  )

  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

export async function setAdminCookie(): Promise<void> {
  const store = await cookies()
  store.set(ADMIN_COOKIE, process.env.ADMIN_PASSWORD!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

export async function logout(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
  store.delete(ADMIN_COOKIE)
}
```

- [ ] **Step 2: Criar middleware de proteção de rotas**

Criar `src/middleware.ts`:

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionToken = request.cookies.get('k7_session')?.value

  // Rotas públicas
  if (pathname === '/' || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // Sem sessão: redireciona para login
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Rotas de admin: verifica cookie admin
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const adminCookie = request.cookies.get('k7_admin')?.value
    if (!adminCookie) {
      return NextResponse.redirect(new URL('/jogos', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 3: Criar API route de autenticação**

Criar `src/app/api/auth/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { loginUser, setAdminCookie, logout } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { name, password } = await req.json()

  const groupPassword = process.env.GROUP_PASSWORD
  const adminPassword = process.env.ADMIN_PASSWORD

  if (password !== groupPassword && password !== adminPassword) {
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
  }

  if (!name || name.trim().length < 2) {
    return NextResponse.json({ error: 'Nome inválido' }, { status: 400 })
  }

  await loginUser(name.trim())

  if (password === adminPassword) {
    await setAdminCookie()
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  await logout()
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Criar página de login**

Criar `src/app/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), password }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error)
      return
    }

    router.push('/jogos')
  }

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl">⚽</span>
          <h1 className="text-2xl font-bold text-yellow-400 mt-2">K7 Copa do Mundo</h1>
          <p className="text-gray-400 text-sm mt-1">Palpites 2026</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Seu nome</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Como quer aparecer no ranking"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Senha do grupo</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-400 text-black font-semibold rounded-lg py-2 hover:bg-yellow-300 disabled:opacity-50 transition"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  )
}
```

- [ ] **Step 5: Testar login no browser**

```bash
npm run dev
```

Acesse `http://localhost:3000`, entre com qualquer nome + senha do `.env.local`. Deve redirecionar para `/jogos` (ainda vazia). Teste senha errada — deve mostrar erro.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.ts src/middleware.ts src/app/api/auth/ src/app/page.tsx
git commit -m "feat: add auth system with shared password and session cookie"
```

---

## Task 6: Wrapper da API football-data.org

**Files:**
- Create: `src/lib/football-api.ts`

- [ ] **Step 1: Registrar API key**

Acesse `https://www.football-data.org/client/register` e obtenha sua API key gratuita. Adicione em `.env.local`:

```
FOOTBALL_API_KEY=sua_chave_aqui
```

- [ ] **Step 2: Criar o wrapper**

Criar `src/lib/football-api.ts`:

```typescript
const BASE_URL = 'https://api.football-data.org/v4'

interface ApiTeam {
  id: number
  name: string
  shortName: string
  crest: string
}

interface ApiMatch {
  id: number
  utcDate: string
  status: string
  stage: string
  group: string | null
  homeTeam: ApiTeam
  awayTeam: ApiTeam
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

const STAGE_MAP: Record<string, string> = {
  GROUP_STAGE: 'group',
  ROUND_OF_16: 'r16',
  QUARTER_FINALS: 'qf',
  SEMI_FINALS: 'sf',
  FINAL: 'final',
}

export async function fetchWorldCupGames(): Promise<ImportedGame[]> {
  const res = await fetch(`${BASE_URL}/competitions/WC/matches`, {
    headers: { 'X-Auth-Token': process.env.FOOTBALL_API_KEY! },
    next: { revalidate: 3600 }, // cache 1h
  })

  if (!res.ok) {
    throw new Error(`football-data.org error: ${res.status}`)
  }

  const data = await res.json()
  const matches: ApiMatch[] = data.matches ?? []

  return matches.map(m => ({
    api_id: String(m.id),
    home_team: m.homeTeam.shortName || m.homeTeam.name,
    away_team: m.awayTeam.shortName || m.awayTeam.name,
    home_flag: m.homeTeam.crest,
    away_flag: m.awayTeam.crest,
    kickoff_at: m.utcDate,
    phase: STAGE_MAP[m.stage] ?? 'group',
    group_name: m.group ? m.group.replace('GROUP_', '') : null,
  }))
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/football-api.ts
git commit -m "feat: add football-data.org API wrapper"
```

---

## Task 7: Admin — Rotas de API

**Files:**
- Create: `src/app/api/admin/import-games/route.ts`, `src/app/api/admin/odds/route.ts`, `src/app/api/admin/results/route.ts`

- [ ] **Step 1: Rota de importação de jogos**

Criar `src/app/api/admin/import-games/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { fetchWorldCupGames } from '@/lib/football-api'
import { getSession } from '@/lib/auth'

export async function POST() {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const games = await fetchWorldCupGames()
  const supabase = createServerClient()

  const { error } = await supabase.from('games').upsert(
    games,
    { onConflict: 'api_id', ignoreDuplicates: false }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ imported: games.length })
}
```

- [ ] **Step 2: Rota de atualização de odds**

Criar `src/app/api/admin/odds/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { gameId, home_odds, away_odds, draw_odds } = await req.json()

  if (!gameId) {
    return NextResponse.json({ error: 'gameId obrigatório' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { error } = await supabase
    .from('games')
    .update({ home_odds, away_odds, draw_odds })
    .eq('id', gameId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Rota de inserção de resultado (com cálculo de pontos)**

Criar `src/app/api/admin/results/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { calculatePoints } from '@/lib/points'
import type { Bet, Game } from '@/lib/types'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { gameId, home_score, away_score } = await req.json()

  if (!gameId || home_score == null || away_score == null) {
    return NextResponse.json({ error: 'Campos obrigatórios: gameId, home_score, away_score' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Buscar jogo para ter as odds
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()

  if (gameError || !game) {
    return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 })
  }

  // Atualizar resultado e status do jogo
  await supabase
    .from('games')
    .update({ home_score, away_score, status: 'finished' })
    .eq('id', gameId)

  // Buscar todos os palpites deste jogo
  const { data: bets } = await supabase
    .from('bets')
    .select('*')
    .eq('game_id', gameId)

  if (!bets?.length) {
    return NextResponse.json({ ok: true, updated: 0 })
  }

  // Calcular e atualizar pontos de cada palpite
  const gameWithResult: Game = { ...game, home_score, away_score }
  const updates = bets.map((bet: Bet) => ({
    id: bet.id,
    points_earned: calculatePoints(bet, gameWithResult),
  }))

  const { error: updateError } = await supabase
    .from('bets')
    .upsert(updates, { onConflict: 'id' })

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, updated: updates.length })
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/
git commit -m "feat: add admin API routes for games, odds and results"
```

---

## Task 8: API de Palpites e Jogos

**Files:**
- Create: `src/app/api/bets/route.ts`, `src/app/api/games/route.ts`

- [ ] **Step 1: Rota de palpites**

Criar `src/app/api/bets/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { gameId, predicted_result, predicted_home_score, predicted_away_score } = await req.json()

  if (!gameId || !predicted_result) {
    return NextResponse.json({ error: 'gameId e predicted_result são obrigatórios' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Verificar se o jogo ainda aceita palpites (1h antes do kickoff)
  const { data: game } = await supabase
    .from('games')
    .select('kickoff_at, status')
    .eq('id', gameId)
    .single()

  if (!game) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 })

  const cutoff = new Date(game.kickoff_at).getTime() - 60 * 60 * 1000
  if (Date.now() >= cutoff || game.status !== 'scheduled') {
    return NextResponse.json({ error: 'Palpites encerrados para este jogo' }, { status: 400 })
  }

  const { error } = await supabase.from('bets').upsert(
    {
      user_id: session.userId,
      game_id: gameId,
      predicted_result,
      predicted_home_score: predicted_home_score ?? null,
      predicted_away_score: predicted_away_score ?? null,
    },
    { onConflict: 'user_id,game_id' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('bets')
    .select('*')
    .eq('user_id', session.userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
```

- [ ] **Step 2: Rota de listagem de jogos**

Criar `src/app/api/games/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const supabase = createServerClient()
  const now = new Date()
  const cutoffThreshold = new Date(now.getTime() + 60 * 60 * 1000) // +1h

  // Buscar jogos
  const { data: games, error } = await supabase
    .from('games')
    .select('*')
    .order('kickoff_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Buscar palpite do próprio usuário
  const { data: myBets } = await supabase
    .from('bets')
    .select('*')
    .eq('user_id', session.userId)

  const myBetsByGame = Object.fromEntries((myBets ?? []).map(b => [b.game_id, b]))

  // Palpites de outros: só visíveis após o corte (kickoff - 1h)
  let otherBets: Record<string, any[]> = {}
  const visibleGameIds = (games ?? [])
    .filter(g => new Date(g.kickoff_at) <= cutoffThreshold)
    .map(g => g.id)

  if (visibleGameIds.length > 0) {
    const { data: allBets } = await supabase
      .from('bets')
      .select('*, users(name)')
      .in('game_id', visibleGameIds)
      .neq('user_id', session.userId) // exclui o próprio palpite (já está em my_bet)

    otherBets = (allBets ?? []).reduce((acc, bet) => {
      acc[bet.game_id] = acc[bet.game_id] ?? []
      acc[bet.game_id].push(bet)
      return acc
    }, {} as Record<string, any[]>)
  }

  const result = (games ?? []).map(g => ({
    ...g,
    my_bet: myBetsByGame[g.id] ?? null,
    other_bets: otherBets[g.id] ?? [],
    bets_open: new Date(g.kickoff_at).getTime() - Date.now() > 60 * 60 * 1000,
  }))

  return NextResponse.json(result)
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/bets/ src/app/api/games/
git commit -m "feat: add bets and games API routes"
```

---

## Task 9: Componente GameCard + BetForm

**Files:**
- Create: `src/components/GameCard.tsx`, `src/components/BetForm.tsx`, `src/components/CountdownTimer.tsx`

- [ ] **Step 1: Criar CountdownTimer**

Criar `src/components/CountdownTimer.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'

interface Props { kickoffAt: string }

export default function CountdownTimer({ kickoffAt }: Props) {
  const [text, setText] = useState('')

  useEffect(() => {
    function update() {
      const diff = new Date(kickoffAt).getTime() - Date.now()
      if (diff <= 0) { setText('Em breve'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setText(h > 0 ? `${h}h ${m}m` : `${m} min`)
    }
    update()
    const id = setInterval(update, 30000)
    return () => clearInterval(id)
  }, [kickoffAt])

  return <span className="text-yellow-400 text-xs font-mono">{text}</span>
}
```

- [ ] **Step 2: Criar BetForm**

Criar `src/components/BetForm.tsx`:

```typescript
'use client'

import { useState } from 'react'
import type { BetResult } from '@/lib/types'

interface Props {
  gameId: string
  homeTeam: string
  awayTeam: string
  homeOdds: number | null
  awayOdds: number | null
  drawOdds: number | null
  existingBet: { predicted_result: BetResult; predicted_home_score: number | null; predicted_away_score: number | null } | null
  onSuccess: () => void
}

export default function BetForm({ gameId, homeTeam, awayTeam, homeOdds, awayOdds, drawOdds, existingBet, onSuccess }: Props) {
  const [result, setResult] = useState<BetResult | ''>(existingBet?.predicted_result ?? '')
  const [homeScore, setHomeScore] = useState<string>(existingBet?.predicted_home_score?.toString() ?? '')
  const [awayScore, setAwayScore] = useState<string>(existingBet?.predicted_away_score?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!result) return
    setSaving(true)
    setError('')

    const res = await fetch('/api/bets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId,
        predicted_result: result,
        predicted_home_score: homeScore !== '' ? parseInt(homeScore) : null,
        predicted_away_score: awayScore !== '' ? parseInt(awayScore) : null,
      }),
    })

    setSaving(false)
    if (!res.ok) { setError((await res.json()).error); return }
    onSuccess()
  }

  const options: { value: BetResult; label: string; odds: number | null }[] = [
    { value: 'home', label: homeTeam, odds: homeOdds },
    { value: 'draw', label: 'Empate', odds: drawOdds },
    { value: 'away', label: awayTeam, odds: awayOdds },
  ]

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3">
      <div className="flex gap-2">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setResult(opt.value)}
            className={`flex-1 rounded-lg py-2 px-1 text-xs font-medium border transition ${
              result === opt.value
                ? 'bg-yellow-400 text-black border-yellow-400'
                : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-500'
            }`}
          >
            <div>{opt.label}</div>
            {opt.odds && <div className="text-[10px] opacity-70 mt-0.5">{opt.odds.toFixed(2)}</div>}
          </button>
        ))}
      </div>

      {result && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={20}
            value={homeScore}
            onChange={e => setHomeScore(e.target.value)}
            placeholder="0"
            className="w-12 text-center bg-gray-800 border border-gray-700 rounded px-1 py-1 text-white text-sm"
          />
          <span className="text-gray-500 text-xs">×</span>
          <input
            type="number"
            min={0}
            max={20}
            value={awayScore}
            onChange={e => setAwayScore(e.target.value)}
            placeholder="0"
            className="w-12 text-center bg-gray-800 border border-gray-700 rounded px-1 py-1 text-white text-sm"
          />
          <span className="text-gray-500 text-xs ml-1">(placar opcional)</span>
        </div>
      )}

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <button
        type="submit"
        disabled={!result || saving}
        className="w-full bg-green-600 text-white rounded-lg py-1.5 text-sm font-medium hover:bg-green-500 disabled:opacity-40 transition"
      >
        {saving ? 'Salvando...' : existingBet ? 'Atualizar palpite' : 'Confirmar palpite'}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Criar GameCard**

Criar `src/components/GameCard.tsx`:

```typescript
'use client'

import { useState } from 'react'
import CountdownTimer from './CountdownTimer'
import BetForm from './BetForm'
import type { Game, Bet } from '@/lib/types'

interface Props {
  game: Game & { my_bet: Bet | null; bets_open: boolean }
  onBetSaved: () => void
}

const PHASE_LABELS: Record<string, string> = {
  group: 'Grupos',
  r16: 'Oitavas',
  qf: 'Quartas',
  sf: 'Semifinal',
  final: 'Final',
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Aberto',
  live: 'Ao vivo',
  finished: 'Finalizado',
}

const RESULT_LABELS: Record<string, string> = {
  home: 'Casa',
  draw: 'Empate',
  away: 'Fora',
}

export default function GameCard({ game, onBetSaved }: Props) {
  const [expanded, setExpanded] = useState(false)
  const kickoff = new Date(game.kickoff_at)

  const isFinished = game.status === 'finished'
  const canBet = game.bets_open && game.status === 'scheduled'

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        <span>{PHASE_LABELS[game.phase]}{game.group_name ? ` · Grupo ${game.group_name}` : ''}</span>
        <span>{kickoff.toLocaleDateString('pt-BR')} · {kickoff.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-center flex-1">
          {game.home_flag && <img src={game.home_flag} alt="" className="w-8 h-8 mx-auto mb-1 object-contain" />}
          <div className="text-white text-sm font-semibold">{game.home_team}</div>
          {game.home_odds && (
            <div className="bg-blue-900 text-blue-300 text-xs px-2 py-0.5 rounded mt-1 inline-block">
              {game.home_odds.toFixed(2)}
            </div>
          )}
        </div>

        <div className="px-4 text-center">
          {isFinished ? (
            <div className="text-yellow-400 font-bold text-xl">
              {game.home_score} – {game.away_score}
            </div>
          ) : (
            <>
              <div className="text-yellow-400 font-bold text-sm">VS</div>
              <CountdownTimer kickoffAt={game.kickoff_at} />
            </>
          )}
          <div className={`text-xs mt-1 ${isFinished ? 'text-gray-500' : canBet ? 'text-green-400' : 'text-red-400'}`}>
            {STATUS_LABELS[game.status]}
          </div>
        </div>

        <div className="text-center flex-1">
          {game.away_flag && <img src={game.away_flag} alt="" className="w-8 h-8 mx-auto mb-1 object-contain" />}
          <div className="text-white text-sm font-semibold">{game.away_team}</div>
          {game.away_odds && (
            <div className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded mt-1 inline-block">
              {game.away_odds.toFixed(2)}
            </div>
          )}
        </div>
      </div>

      {game.my_bet && (
        <div className="mt-3 border-t border-gray-800 pt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Seu palpite: <span className="text-yellow-400 font-medium">{RESULT_LABELS[game.my_bet.predicted_result]}</span>
              {game.my_bet.predicted_home_score != null && ` · ${game.my_bet.predicted_home_score}×${game.my_bet.predicted_away_score}`}
            </span>
            {isFinished && (
              <span className={game.my_bet.points_earned > 0 ? 'text-green-400 font-bold' : 'text-gray-500'}>
                {game.my_bet.points_earned > 0 ? `+${game.my_bet.points_earned}pts` : '0pts'}
              </span>
            )}
          </div>
        </div>
      )}

      {canBet && (
        <div className="mt-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {expanded ? 'Fechar' : game.my_bet ? 'Editar palpite' : 'Fazer palpite →'}
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
```

- [ ] **Step 4: Commit**

```bash
git add src/components/
git commit -m "feat: add GameCard, BetForm and CountdownTimer components"
```

---

## Task 10: Página /jogos

**Files:**
- Create: `src/app/jogos/page.tsx`

- [ ] **Step 1: Criar a página de jogos**

Criar `src/app/jogos/page.tsx`:

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import GameCard from '@/components/GameCard'
import type { Game, Bet } from '@/lib/types'

type GameWithBet = Game & { my_bet: Bet | null; bets_open: boolean }

const PHASE_ORDER = ['group', 'r16', 'qf', 'sf', 'final']
const PHASE_LABELS: Record<string, string> = {
  group: 'Fase de Grupos',
  r16: 'Oitavas de Final',
  qf: 'Quartas de Final',
  sf: 'Semifinal',
  final: 'Final',
}

export default function JogosPage() {
  const [games, setGames] = useState<GameWithBet[]>([])
  const [loading, setLoading] = useState(true)

  const fetchGames = useCallback(async () => {
    const res = await fetch('/api/games')
    if (res.ok) setGames(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchGames() }, [fetchGames])

  const byPhase = PHASE_ORDER.reduce((acc, phase) => {
    const phaseGames = games.filter(g => g.phase === phase)
    if (phaseGames.length) acc[phase] = phaseGames
    return acc
  }, {} as Record<string, GameWithBet[]>)

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <span className="text-yellow-400 font-bold">⚽ K7 Copa</span>
        <div className="flex gap-4 text-sm text-gray-400">
          <a href="/jogos" className="text-white">Jogos</a>
          <a href="/ranking" className="hover:text-white">Ranking</a>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <p className="text-gray-400 text-center py-12">Carregando jogos...</p>
        ) : Object.keys(byPhase).length === 0 ? (
          <p className="text-gray-400 text-center py-12">Nenhum jogo cadastrado ainda.</p>
        ) : (
          Object.entries(byPhase).map(([phase, phaseGames]) => (
            <section key={phase} className="mb-8">
              <h2 className="text-yellow-400 font-semibold text-sm uppercase tracking-wider mb-3">
                {PHASE_LABELS[phase]}
              </h2>
              <div className="space-y-3">
                {phaseGames.map(game => (
                  <GameCard key={game.id} game={game} onBetSaved={fetchGames} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Testar no browser**

```bash
npm run dev
```

Acesse `/jogos`. Deve mostrar "Nenhum jogo cadastrado ainda." (banco vazio por enquanto). Isso é esperado.

- [ ] **Step 3: Commit**

```bash
git add src/app/jogos/
git commit -m "feat: add jogos page with game cards and bet form"
```

---

## Task 11: Componente RankingTable + Página /ranking

**Files:**
- Create: `src/components/RankingTable.tsx`, `src/app/ranking/page.tsx`

- [ ] **Step 1: Criar RankingTable com Supabase Realtime**

Criar `src/components/RankingTable.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase-browser'
import type { RankingEntry } from '@/lib/types'

export default function RankingTable() {
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchRanking() {
    const supabase = createBrowserClient()
    const { data } = await supabase
      .from('bets')
      .select('user_id, points_earned, users(name)')

    if (!data) return

    const grouped: Record<string, { name: string; total: number; correct: number }> = {}
    for (const row of data) {
      const name = (row.users as any)?.name ?? 'Desconhecido'
      if (!grouped[row.user_id]) {
        grouped[row.user_id] = { name, total: 0, correct: 0 }
      }
      grouped[row.user_id].total += row.points_earned
      if (row.points_earned > 0) grouped[row.user_id].correct++
    }

    const sorted = Object.entries(grouped)
      .map(([user_id, v]) => ({ user_id, name: v.name, total_points: v.total, correct_results: v.correct }))
      .sort((a, b) => b.total_points - a.total_points)

    setRanking(sorted)
    setLoading(false)
  }

  useEffect(() => {
    fetchRanking()

    const supabase = createBrowserClient()
    const channel = supabase
      .channel('bets-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bets' }, fetchRanking)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  if (loading) return <p className="text-gray-400 text-center py-8">Carregando ranking...</p>
  if (!ranking.length) return <p className="text-gray-400 text-center py-8">Nenhum palpite ainda.</p>

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left text-xs text-gray-500 px-4 py-3">#</th>
            <th className="text-left text-xs text-gray-500 px-4 py-3">Jogador</th>
            <th className="text-right text-xs text-gray-500 px-4 py-3">Acertos</th>
            <th className="text-right text-xs text-gray-500 px-4 py-3">Pontos</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((entry, i) => (
            <tr key={entry.user_id} className="border-b border-gray-800 last:border-0">
              <td className="px-4 py-3 text-sm">{medals[i] ?? `${i + 1}º`}</td>
              <td className="px-4 py-3 text-white font-medium">{entry.name}</td>
              <td className="px-4 py-3 text-right text-gray-400 text-sm">{entry.correct_results}</td>
              <td className="px-4 py-3 text-right text-yellow-400 font-bold">{entry.total_points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Habilitar Realtime no Supabase**

No painel Supabase:
1. Vá em **Database → Replication**
2. Ative a tabela `bets` para realtime

- [ ] **Step 3: Criar página de ranking**

Criar `src/app/ranking/page.tsx`:

```typescript
import RankingTable from '@/components/RankingTable'

export default function RankingPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <span className="text-yellow-400 font-bold">⚽ K7 Copa</span>
        <div className="flex gap-4 text-sm text-gray-400">
          <a href="/jogos" className="hover:text-white">Jogos</a>
          <a href="/ranking" className="text-white">Ranking</a>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-white mb-4">🏆 Ranking</h1>
        <RankingTable />
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/RankingTable.tsx src/app/ranking/
git commit -m "feat: add ranking page with real-time Supabase updates"
```

---

## Task 12: Painel Admin

**Files:**
- Create: `src/app/admin/page.tsx`

- [ ] **Step 1: Criar painel de administração**

Criar `src/app/admin/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import type { Game } from '@/lib/types'

export default function AdminPage() {
  const [games, setGames] = useState<Game[]>([])
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedGame, setSelectedGame] = useState<string>('')
  const [odds, setOdds] = useState({ home: '', draw: '', away: '' })
  const [result, setResult] = useState({ home: '', away: '' })

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
    setMessage(res.ok ? `✓ ${data.imported} jogos importados` : `Erro: ${data.error}`)
    setImporting(false)
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
    setMessage(res.ok ? '✓ Odds salvas' : 'Erro ao salvar odds')
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
    setMessage(res.ok ? `✓ Resultado salvo. ${data.updated} palpites pontuados.` : `Erro: ${data.error}`)
    fetchGames()
  }

  const game = games.find(g => g.id === selectedGame)

  return (
    <main className="min-h-screen bg-gray-950 text-white px-4 py-6">
      <nav className="mb-6 flex items-center justify-between">
        <span className="text-yellow-400 font-bold">⚽ K7 Copa · Admin</span>
        <a href="/jogos" className="text-sm text-gray-400 hover:text-white">← Voltar</a>
      </nav>

      <div className="max-w-2xl mx-auto space-y-6">
        {message && <p className="text-sm text-green-400 bg-green-950 border border-green-800 rounded-lg px-4 py-2">{message}</p>}

        {/* Importar jogos */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-3">Importar Jogos</h2>
          <p className="text-sm text-gray-400 mb-4">Busca os jogos da Copa 2026 em football-data.org e atualiza o banco.</p>
          <button
            onClick={handleImport}
            disabled={importing}
            className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-blue-500 disabled:opacity-50"
          >
            {importing ? 'Importando...' : 'Importar da API'}
          </button>
        </section>

        {/* Selecionar jogo */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-3">Selecionar Jogo</h2>
          <select
            value={selectedGame}
            onChange={e => setSelectedGame(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
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
            {/* Odds */}
            <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="font-semibold text-white mb-3">Definir Odds — {game?.home_team} × {game?.away_team}</h2>
              <div className="flex gap-3">
                {[
                  { key: 'home', label: game?.home_team ?? 'Casa' },
                  { key: 'draw', label: 'Empate' },
                  { key: 'away', label: game?.away_team ?? 'Fora' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex-1">
                    <label className="text-xs text-gray-400 block mb-1">{label}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={odds[key as keyof typeof odds]}
                      onChange={e => setOdds(o => ({ ...o, [key]: e.target.value }))}
                      placeholder={key === 'home' ? game?.home_odds?.toString() : key === 'draw' ? game?.draw_odds?.toString() : game?.away_odds?.toString()}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-sm"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={handleSaveOdds}
                className="mt-3 bg-yellow-400 text-black rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-yellow-300"
              >
                Salvar Odds
              </button>
            </section>

            {/* Resultado */}
            {game?.status !== 'finished' && (
              <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="font-semibold text-white mb-3">Inserir Resultado</h2>
                <div className="flex items-center gap-3">
                  <div>
                    <label className="text-xs text-gray-400">{game?.home_team}</label>
                    <input
                      type="number"
                      min={0}
                      value={result.home}
                      onChange={e => setResult(r => ({ ...r, home: e.target.value }))}
                      className="block w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-center"
                    />
                  </div>
                  <span className="text-gray-500 mt-4">×</span>
                  <div>
                    <label className="text-xs text-gray-400">{game?.away_team}</label>
                    <input
                      type="number"
                      min={0}
                      value={result.away}
                      onChange={e => setResult(r => ({ ...r, away: e.target.value }))}
                      className="block w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-center"
                    />
                  </div>
                  <button
                    onClick={handleSaveResult}
                    className="mt-4 bg-red-600 text-white rounded-lg px-4 py-1.5 text-sm hover:bg-red-500"
                  >
                    Finalizar Jogo
                  </button>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Testar fluxo completo**

1. Login com senha admin → acessa `/admin`
2. Clica "Importar da API" → jogos aparecem no select
3. Seleciona jogo → define odds → salva
4. No `/jogos`: verifica se card mostra odds
5. Faz palpite
6. Volta ao admin → insere resultado → verifica pontos no `/ranking`

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/
git commit -m "feat: add admin panel for game management"
```

---

## Task 13: Deploy na Vercel

**Files:**
- Create: `.gitignore` (atualizar), `vercel.json` (opcional)

- [ ] **Step 1: Garantir que .gitignore está correto**

Verificar que `.gitignore` contém:

```
.env.local
.env*.local
.next/
node_modules/
```

- [ ] **Step 2: Rodar build local para verificar**

```bash
npm run build
```

Esperado: build bem-sucedido sem erros de tipo. Se houver erros de TypeScript, corrigi-los antes de continuar.

- [ ] **Step 3: Criar projeto na Vercel**

```bash
npx vercel
```

Ou acesse `vercel.com`, conecte o repositório GitHub e importe o projeto.

- [ ] **Step 4: Configurar variáveis de ambiente na Vercel**

No painel Vercel → **Settings → Environment Variables**, adicionar:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GROUP_PASSWORD
ADMIN_PASSWORD
FOOTBALL_API_KEY
```

- [ ] **Step 5: Fazer deploy**

```bash
npx vercel --prod
```

- [ ] **Step 6: Testar URL de produção**

Acesse a URL gerada pela Vercel. Teste o fluxo completo:
- Login com senha do grupo
- Visualizar jogos
- Fazer palpite
- Ver ranking

- [ ] **Step 7: Commit final**

```bash
git add .
git commit -m "chore: finalize project for production deploy"
```

---

## Resumo da Ordem de Execução

| Task | O que entrega | Testável |
|------|--------------|---------|
| 1 | Setup Next.js | `npm run dev` funciona |
| 2 | Schema Supabase | Tabelas no painel |
| 3 | Tipos + clients | Imports sem erro |
| 4 | Pontos (TDD) | `npm test` passa |
| 5 | Auth + Login | Login redireciona |
| 6 | API football-data | Wrapper importável |
| 7 | Admin API routes | Endpoints respondem |
| 8 | API bets/games | CRUD de palpites |
| 9 | Componentes | Cards renderizam |
| 10 | Página /jogos | Listagem funciona |
| 11 | Ranking + Realtime | Tabela atualiza ao vivo |
| 12 | Admin UI | Fluxo completo testável |
| 13 | Deploy Vercel | URL pública funcionando |
