# K7 BET ⚽

Bolão de palpites da Copa do Mundo 2026 para um grupo fechado de amigos. Cada participante entra com nome + senha compartilhada, dá seus palpites nos jogos, e acompanha o ranking em tempo real.

## Funcionalidades

- **Login simples**: acesso por nome + senha de grupo (sem cadastro de e-mail/conta). Uma senha separada libera o modo administrador.
- **Palpites (`/jogos`)**: escolha de resultado (casa/empate/fora), placar exato e critério de desempate, com prazo de corte antes do início de cada jogo.
- **Chaveamento e torneio (`/chaveamento`, `/torneio`)**: visualização do mata-mata (fase de grupos, rodada de 32, oitavas, quartas, semi e final) e palpites sobre o campeão/torneio.
- **Ranking (`/ranking`)**: pontuação acumulada de cada participante, atualizada conforme os resultados são sincronizados.
- **Painel admin (`/admin`)**: importação de jogos, sincronização de resultados e odds via API externa de futebol, correções manuais de placares/palpites órfãos e ferramentas de diagnóstico.

## Stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- [Supabase](https://supabase.com) (Postgres) como banco de dados
- Tailwind CSS 4
- Vitest + Testing Library para testes
- Integração com API externa de futebol (football-data.org / API-Football) para jogos, escalações e odds

## Como rodar localmente

### Pré-requisitos

- Node.js 20+
- Um projeto Supabase (URL + chaves)

### Instalação

```bash
npm install
```

### Variáveis de ambiente

Crie um `.env.local` a partir do `.env.local.example` com as seguintes chaves:

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública (anon) do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de service role (usada nas rotas de API, já que RLS está desabilitado) |
| `GROUP_PASSWORD` | Senha compartilhada para login dos participantes |
| `ADMIN_PASSWORD` | Senha para acesso ao painel administrativo |
| `APIFOOTBALL_KEY` | Chave da API-Football (escalações/odds) |
| `FOOTBALL_DATA_API_KEY` | Chave da football-data.org (jogos/resultados) |

### Banco de dados

O schema (tabelas `users`, `games`, `bets`) está em [`supabase/schema.sql`](./supabase/schema.sql). Rode esse SQL no seu projeto Supabase antes de subir a aplicação.

### Rodando o projeto

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

### Testes e lint

```bash
npm test          # roda os testes com Vitest
npm run type-check # checagem de tipos
```

## Deploy

O projeto está configurado para deploy na [Vercel](https://vercel.com) (`vercel.json` + `vercel-build`). Basta conectar o repositório e configurar as variáveis de ambiente acima no painel do projeto.
