create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  email text primary key,
  created_at timestamptz not null default now()
);

insert into public.admin_users (email)
values ('a.a.sportive@gmail.com')
on conflict (email) do nothing;

create table if not exists public.teams (
  id text primary key,
  country text not null,
  country_en text not null default '',
  country_he text not null default '',
  country_ar text not null default '',
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
  name_en text not null default '',
  name_he text not null default '',
  name_ar text not null default '',
  number int,
  position text,
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
  venue_en text not null default '',
  venue_he text not null default '',
  venue_ar text not null default '',
  home_team_id text references public.teams(id) on delete set null,
  away_team_id text references public.teams(id) on delete set null,
  home_label text,
  away_label text,
  home_score int,
  away_score int,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'final')),
  minute int,
  match_phase text not null default 'scheduled',
  phase_started_at timestamptz,
  pause_started_at timestamptz,
  phase_paused_seconds int not null default 0,
  previous_phase text,
  match_start_time timestamptz,
  match_end_time timestamptz,
  first_half_start_time timestamptz,
  first_half_end_time timestamptz,
  second_half_start_time timestamptz,
  second_half_end_time timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references public.matches(id) on delete cascade,
  minute int not null,
  event_phase text,
  display_minute text,
  type text not null default 'goal',
  event_type text not null default 'goal',
  team_id text references public.teams(id) on delete set null,
  player_id text references public.players(id) on delete set null,
  player text not null,
  assist_player_id text references public.players(id) on delete set null,
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

alter table public.teams add column if not exists country_en text not null default '';
alter table public.teams add column if not exists country_he text not null default '';
alter table public.teams add column if not exists country_ar text not null default '';
update public.teams
set country_en = coalesce(nullif(country_en, ''), country),
    country_he = coalesce(country_he, ''),
    country_ar = coalesce(country_ar, '');

alter table public.players add column if not exists name_en text not null default '';
alter table public.players add column if not exists name_he text not null default '';
alter table public.players add column if not exists name_ar text not null default '';
alter table public.players alter column number drop not null;
alter table public.players alter column position drop not null;
alter table public.players alter column number drop default;
alter table public.players alter column position drop default;
update public.players
set name_en = coalesce(nullif(name_en, ''), name),
    name_he = coalesce(name_he, ''),
    name_ar = coalesce(name_ar, '');

alter table public.matches add column if not exists venue_en text not null default '';
alter table public.matches add column if not exists venue_he text not null default '';
alter table public.matches add column if not exists venue_ar text not null default '';
alter table public.matches add column if not exists match_phase text not null default 'scheduled';
alter table public.matches add column if not exists phase_started_at timestamptz;
alter table public.matches add column if not exists pause_started_at timestamptz;
alter table public.matches add column if not exists phase_paused_seconds int not null default 0;
alter table public.matches add column if not exists previous_phase text;
alter table public.matches add column if not exists match_start_time timestamptz;
alter table public.matches add column if not exists match_end_time timestamptz;
alter table public.matches add column if not exists first_half_start_time timestamptz;
alter table public.matches add column if not exists first_half_end_time timestamptz;
alter table public.matches add column if not exists second_half_start_time timestamptz;
alter table public.matches add column if not exists second_half_end_time timestamptz;
update public.matches
set venue = 'El Capitano Stadium - Deir Hanna',
    venue_en = 'El Capitano Stadium - Deir Hanna',
    venue_he = 'אצטדיון אל קפיטנו - דיר חנא',
    venue_ar = 'ملعب الكابيتانو ديرحنا (السهل)';

alter table public.match_events add column if not exists event_type text not null default 'goal';
alter table public.match_events add column if not exists event_phase text;
alter table public.match_events add column if not exists display_minute text;
alter table public.match_events add column if not exists player_id text references public.players(id) on delete set null;
alter table public.match_events add column if not exists assist_player_id text references public.players(id) on delete set null;
update public.match_events set event_type = coalesce(nullif(event_type, ''), type, 'goal');
update public.match_events
set event_type = type
where event_type = 'goal'
  and type is not null
  and type <> 'goal';

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
alter table public.player_match_stats enable row level security;

drop policy if exists "Admins can read themselves" on public.admin_users;
create policy "Admins can read themselves"
on public.admin_users for select
using (email = auth.jwt() ->> 'email');

drop policy if exists "Admins can invite admin users" on public.admin_users;
create policy "Admins can invite admin users"
on public.admin_users for insert
with check (public.is_admin());

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

drop policy if exists "Public can read player match stats" on public.player_match_stats;
create policy "Public can read player match stats" on public.player_match_stats for select using (true);
drop policy if exists "Admins can write player match stats" on public.player_match_stats;
create policy "Admins can write player match stats" on public.player_match_stats for all using (public.is_admin()) with check (public.is_admin());
