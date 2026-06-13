# Deploy na Vercel

## Pré-requisitos

1. Conta na [Vercel](https://vercel.com)
2. Projeto criado no [Supabase](https://supabase.com)
3. API key gratuita em [football-data.org](https://www.football-data.org/client/register)

## Setup Supabase

1. Crie um projeto no Supabase
2. Vá em **SQL Editor** e execute o conteúdo de `supabase/schema.sql`
3. Vá em **Database → Replication** e ative a tabela `bets` para Realtime
4. Copie a **Project URL** e as chaves em **Settings → API**

## Deploy na Vercel

1. Instale a Vercel CLI: `npm i -g vercel`
2. Na raiz do projeto: `vercel`
3. Siga o wizard de configuração
4. No painel Vercel → **Settings → Environment Variables**, adicione:

| Variável | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do seu projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key do Supabase |
| `GROUP_PASSWORD` | Senha compartilhada do grupo |
| `ADMIN_PASSWORD` | Senha do administrador (mais forte) |
| `FOOTBALL_API_KEY` | Chave da football-data.org |

5. Faça o deploy de produção: `vercel --prod`

## Primeiro uso

1. Acesse a URL gerada pela Vercel
2. Entre com a senha de **admin** e um nome de usuário
3. Vá em `/admin` e clique em **Importar da API** para buscar os jogos da Copa 2026
4. Para cada jogo, defina as odds manualmente
5. Compartilhe a URL e a **senha do grupo** com seus amigos
6. Quando um jogo terminar, vá ao admin e insira o resultado — os pontos são calculados automaticamente

## Usuários

- **Participantes**: acessam com a `GROUP_PASSWORD`
- **Admin**: acessa com a `ADMIN_PASSWORD` (tem acesso ao painel `/admin`)
