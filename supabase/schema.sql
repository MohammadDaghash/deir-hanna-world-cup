create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  email text primary key,
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id text primary key,
  country text not null,
  code text not null,
  group_code text not null,
  color text not null default '#1f6d4d',
  secondary text not null default '#eef3e9',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.players (
  id text primary key,
  team_id text not null references public.teams(id) on delete cascade,
  name text not null,
  number int not null,
  position text not null,
  goals int not null default 0,
  assists int not null default 0,
  yellow_cards int not null default 0,
  red_cards int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, number)
);

create table if not exists public.matches (
  id text primary key,
  stage text not null,
  group_code text,
  matchday int,
  date date not null,
  time text not null,
  venue text not null,
  home_team_id text references public.teams(id) on delete set null,
  away_team_id text references public.teams(id) on delete set null,
  home_label text,
  away_label text,
  home_score int,
  away_score int,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'final')),
  minute int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references public.matches(id) on delete cascade,
  minute int not null,
  type text not null default 'goal',
  team_id text references public.teams(id) on delete set null,
  player text not null,
  assist text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.lineups (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references public.matches(id) on delete cascade,
  side text not null check (side in ('home', 'away')),
  formation text not null default '3-3-1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, side)
);

create table if not exists public.lineup_players (
  id uuid primary key default gen_random_uuid(),
  lineup_id uuid not null references public.lineups(id) on delete cascade,
  player_id text not null references public.players(id) on delete cascade,
  role text not null check (role in ('starter', 'bench')),
  slot int not null,
  created_at timestamptz not null default now(),
  unique (lineup_id, player_id),
  unique (lineup_id, role, slot)
);

create table if not exists public.match_votes (
  match_id text not null references public.matches(id) on delete cascade,
  viewer_id uuid not null,
  choice text not null check (choice in ('home', 'draw', 'away')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (match_id, viewer_id)
);

create table if not exists public.tournament_votes (
  vote_type text not null check (vote_type in ('tournament_winner', 'top_scorer', 'best_player')),
  candidate_id text not null,
  viewer_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (vote_type, viewer_id)
);

create table if not exists public.player_match_stats (
  player_id text not null references public.players(id) on delete cascade,
  match_id text not null references public.matches(id) on delete cascade,
  minutes int not null default 0,
  shots int not null default 0,
  pass_accuracy int,
  tackles int not null default 0,
  saves int not null default 0,
  goals int not null default 0,
  assists int not null default 0,
  yellow_cards int not null default 0,
  red_cards int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (player_id, match_id)
);

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.admin_users
    where email = auth.jwt() ->> 'email'
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.validate_match_vote_choice()
returns trigger
language plpgsql
as $$
declare
  match_stage text;
begin
  select stage into match_stage from public.matches where id = new.match_id;

  if match_stage is null then
    raise exception 'Match not found';
  end if;

  if new.choice = 'draw' and match_stage <> 'League' then
    raise exception 'Draw votes are only allowed for league matches';
  end if;

  return new;
end;
$$;

drop trigger if exists set_teams_updated_at on public.teams;
create trigger set_teams_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

drop trigger if exists set_players_updated_at on public.players;
create trigger set_players_updated_at
before update on public.players
for each row execute function public.set_updated_at();

drop trigger if exists set_matches_updated_at on public.matches;
create trigger set_matches_updated_at
before update on public.matches
for each row execute function public.set_updated_at();

drop trigger if exists set_lineups_updated_at on public.lineups;
create trigger set_lineups_updated_at
before update on public.lineups
for each row execute function public.set_updated_at();

drop trigger if exists set_match_votes_updated_at on public.match_votes;
create trigger set_match_votes_updated_at
before update on public.match_votes
for each row execute function public.set_updated_at();

drop trigger if exists set_tournament_votes_updated_at on public.tournament_votes;
create trigger set_tournament_votes_updated_at
before update on public.tournament_votes
for each row execute function public.set_updated_at();

drop trigger if exists set_player_match_stats_updated_at on public.player_match_stats;
create trigger set_player_match_stats_updated_at
before update on public.player_match_stats
for each row execute function public.set_updated_at();

drop trigger if exists validate_match_vote_choice on public.match_votes;
create trigger validate_match_vote_choice
before insert or update on public.match_votes
for each row execute function public.validate_match_vote_choice();

alter table public.admin_users enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_events enable row level security;
alter table public.lineups enable row level security;
alter table public.lineup_players enable row level security;
alter table public.match_votes enable row level security;
alter table public.tournament_votes enable row level security;
alter table public.player_match_stats enable row level security;

drop policy if exists "Admins can read themselves" on public.admin_users;
create policy "Admins can read themselves"
on public.admin_users for select
using (email = auth.jwt() ->> 'email');

drop policy if exists "Public can read teams" on public.teams;
create policy "Public can read teams" on public.teams for select using (true);
drop policy if exists "Admins can write teams" on public.teams;
create policy "Admins can write teams" on public.teams for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public can read players" on public.players;
create policy "Public can read players" on public.players for select using (true);
drop policy if exists "Admins can write players" on public.players;
create policy "Admins can write players" on public.players for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public can read matches" on public.matches;
create policy "Public can read matches" on public.matches for select using (true);
drop policy if exists "Admins can write matches" on public.matches;
create policy "Admins can write matches" on public.matches for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public can read match events" on public.match_events;
create policy "Public can read match events" on public.match_events for select using (true);
drop policy if exists "Admins can write match events" on public.match_events;
create policy "Admins can write match events" on public.match_events for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public can read lineups" on public.lineups;
create policy "Public can read lineups" on public.lineups for select using (true);
drop policy if exists "Admins can write lineups" on public.lineups;
create policy "Admins can write lineups" on public.lineups for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public can read lineup players" on public.lineup_players;
create policy "Public can read lineup players" on public.lineup_players for select using (true);
drop policy if exists "Admins can write lineup players" on public.lineup_players;
create policy "Admins can write lineup players" on public.lineup_players for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public can read votes" on public.match_votes;
create policy "Public can read votes" on public.match_votes for select using (true);
drop policy if exists "Public can insert votes" on public.match_votes;
create policy "Public can insert votes" on public.match_votes for insert with check (true);
drop policy if exists "Public can update votes" on public.match_votes;
create policy "Public can update votes" on public.match_votes for update using (true) with check (true);

drop policy if exists "Public can read tournament votes" on public.tournament_votes;
create policy "Public can read tournament votes" on public.tournament_votes for select using (true);
drop policy if exists "Public can insert tournament votes" on public.tournament_votes;
create policy "Public can insert tournament votes" on public.tournament_votes for insert with check (true);
drop policy if exists "Public can update tournament votes" on public.tournament_votes;
create policy "Public can update tournament votes" on public.tournament_votes for update using (true) with check (true);

drop policy if exists "Public can read player match stats" on public.player_match_stats;
create policy "Public can read player match stats" on public.player_match_stats for select using (true);
drop policy if exists "Admins can write player match stats" on public.player_match_stats;
create policy "Admins can write player match stats" on public.player_match_stats for all using (public.is_admin()) with check (public.is_admin());
