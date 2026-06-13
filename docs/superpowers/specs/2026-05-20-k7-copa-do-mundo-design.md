# K7 Copa do Mundo — Design Spec

**Data:** 2026-05-20  
**Status:** Aprovado

---

## Visão Geral

Site privado de palpites da Copa do Mundo 2026 para um grupo fechado de amigos. Funciona como uma casa de apostas, mas sem dinheiro — o prêmio é pontos. Acesso via senha compartilhada + nome do usuário. Sem cadastro individual.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend + Backend | Next.js 14 (App Router, TypeScript) |
| Banco de dados | Supabase (PostgreSQL + Realtime) |
| Estilo | Tailwind CSS (tema dark — fundo escuro, amarelo/verde) |
| Deploy | Vercel |
| API de jogos | football-data.org (plano gratuito) |

---

## Autenticação & Acesso

- Acesso via **senha secreta compartilhada** (hash em variável de ambiente)
- Na primeira entrada, usuário digita sua **senha do grupo** e escolhe um **nome único**
- Nome e token de sessão salvos em **cookie httpOnly** por 30 dias
- **Admin** identificado por uma segunda senha separada (mais forte), com acesso ao painel de gerenciamento
- Middleware Next.js valida cookie em todas as rotas protegidas

---

## Páginas

### `/` — Login
- Campo de senha do grupo
- Campo de nome do participante (apenas no primeiro acesso)
- Redireciona para `/jogos` após autenticação

### `/jogos` — Partidas
- Jogos agrupados por fase: Grupos → Oitavas → Quartas → Semifinal → Final
- Cada card de jogo exibe:
  - Bandeiras e nomes dos times
  - Odds (Casa / Empate / Fora)
  - Contagem regressiva até o jogo
  - Status: Aberto / Encerrado para palpites / Em andamento / Finalizado
- Formulário de palpite inline: escolha de resultado + placar opcional
- Palpites de outros usuários **ocultos** até 1h antes do jogo
- Palpite bloqueado automaticamente **1 hora antes do kickoff**

### `/ranking` — Pontuação
- Tabela geral com nome, pontos totais, número de acertos
- Atualiza em **tempo real** via Supabase Realtime
- Detalhe por usuário: histórico de palpites com resultado e pontos ganhos em cada jogo

### `/admin` — Painel (acesso restrito)
- Importar jogos da Copa via API football-data.org
- Definir/editar odds de cada partida manualmente
- Inserir resultado final de um jogo (dispara cálculo automático de pontos)
- Listar todos os palpites de uma partida

---

## Sistema de Pontos

### Pontuação base

| Tipo de acerto | Pontos |
|---------------|--------|
| Resultado correto (V/E/D) | 1 pt |
| Placar exato | 3 pts (inclui o 1pt de resultado) |

### Bônus de odds (underdog)

Aplicado quando o usuário aposta no time com odds mais altas e acerta:

| Odds do time apostado | Bônus |
|----------------------|-------|
| < 2.0 (favorito) | +0 pts |
| 2.0 – 2.9 | +1 pt |
| 3.0 – 3.9 | +2 pts |
| ≥ 4.0 (azarão) | +3 pts |

O bônus **não se aplica a empates** (odds de empate não são comparadas).

### Exemplo
- França (1.30) × EUA (4.50) → usuário aposta EUA, EUA ganha
  - Resultado certo: **1pt** + bônus odds ≥ 4.0: **+3pt** = **4 pts total**
  - Se acertar o placar exato: **3pt** + **+3pt** = **6 pts total**

### Cálculo
O cálculo roda em API route Next.js (`POST /api/admin/results`) quando o admin insere o resultado. Atualiza `bets.points_earned` para todos os palpites daquela partida em uma única transação.

---

## Banco de Dados (Supabase PostgreSQL)

```sql
-- Participantes
users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL UNIQUE,
  session_token text NOT NULL,
  created_at    timestamptz DEFAULT now()
)

-- Partidas
games (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id        text UNIQUE,
  home_team     text NOT NULL,
  away_team     text NOT NULL,
  home_flag     text,
  away_flag     text,
  kickoff_at    timestamptz NOT NULL,
  phase         text NOT NULL,       -- 'group' | 'r16' | 'qf' | 'sf' | 'final'
  group_name    text,                -- 'A'–'H', null em fases eliminatórias
  home_odds     numeric(4,2),
  away_odds     numeric(4,2),
  draw_odds     numeric(4,2),
  home_score    int,
  away_score    int,
  status        text DEFAULT 'scheduled' -- 'scheduled' | 'live' | 'finished'
)

-- Palpites
bets (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES users(id),
  game_id              uuid NOT NULL REFERENCES games(id),
  predicted_result     text NOT NULL,  -- 'home' | 'draw' | 'away'
  predicted_home_score int,
  predicted_away_score int,
  points_earned        int NOT NULL DEFAULT 0,
  created_at           timestamptz DEFAULT now(),
  UNIQUE(user_id, game_id)
)
```

**Índices:** `games(kickoff_at)`, `bets(game_id)`, `bets(user_id)`

---

## API de Jogos

- **Provedor:** football-data.org (endpoint `/v4/competitions/WC/matches`)
- **Rota admin:** `POST /api/admin/import-games` — busca jogos da Copa 2026 e insere/atualiza na tabela `games`
- Odds **não** vêm da API — são definidas manualmente pelo admin após a importação
- Copa do Mundo 2026 começa em junho de 2026

---

## Regras de Negócio

1. Cada usuário faz **no máximo 1 palpite por jogo**; pode editar até o corte
2. Corte de palpites: **1 hora antes do kickoff** (`kickoff_at - interval '1 hour'`)
3. Palpites ficam **ocultos** para outros usuários até o corte
4. Resultado inserido pelo admin → pontos calculados e gravados imediatamente
5. Placar exato é opcional — se não informado, só concorre ao 1pt de resultado
6. Nome do usuário é imutável após o primeiro login

---

## Estrutura de Arquivos (Next.js App Router)

```
src/
  app/
    page.tsx                  # Login
    jogos/page.tsx            # Lista de jogos
    ranking/page.tsx          # Tabela de pontuação
    admin/page.tsx            # Painel admin
    api/
      auth/route.ts           # Login / logout
      bets/route.ts           # POST palpite, GET palpites do usuário
      admin/
        import-games/route.ts # Importar da API
        results/route.ts      # Inserir resultado + calcular pontos
        odds/route.ts         # Atualizar odds
  lib/
    supabase.ts               # Client Supabase
    auth.ts                   # Helpers de sessão / middleware
    points.ts                 # Lógica de cálculo de pontos
    football-api.ts           # Wrapper football-data.org
  components/
    GameCard.tsx
    BetForm.tsx
    RankingTable.tsx
  middleware.ts               # Proteção de rotas
```

---

## Fora de Escopo

- Apostas em dinheiro
- Notificações push / e-mail
- Chat entre usuários
- Estatísticas avançadas por time
- App mobile nativo
