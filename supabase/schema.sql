-- Habilitar extensão UUID
create extension if not exists "pgcrypto";

-- Participantes
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  session_token text not null,
  is_admin      boolean not null default false,
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
  user_id              uuid not null references users(id) on delete cascade,
  game_id              uuid not null references games(id),
  predicted_result     text not null check (predicted_result in ('home','draw','away')),
  predicted_home_score int,
  predicted_away_score int,
  tiebreaker_winner    text check (tiebreaker_winner in ('home','away')),
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
