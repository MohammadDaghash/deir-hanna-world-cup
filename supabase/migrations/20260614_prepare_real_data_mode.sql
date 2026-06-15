-- Prepare the tournament database for real organizer data.
-- This migration is intentionally additive for schema changes, then clears demo tournament rows.
-- It preserves public.admin_users so existing admin access continues to work.

begin;

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
update public.players
set name_en = coalesce(nullif(name_en, ''), name),
    name_he = coalesce(name_he, ''),
    name_ar = coalesce(name_ar, '');

alter table public.matches add column if not exists venue_en text not null default '';
alter table public.matches add column if not exists venue_he text not null default '';
alter table public.matches add column if not exists venue_ar text not null default '';
update public.matches
set venue_en = coalesce(nullif(venue_en, ''), venue),
    venue_he = coalesce(venue_he, ''),
    venue_ar = coalesce(venue_ar, '');

do $$
begin
  if to_regclass('public.match_votes') is not null then
    delete from public.match_votes;
  end if;

  if to_regclass('public.tournament_votes') is not null then
    delete from public.tournament_votes;
  end if;

  if to_regclass('public.player_match_stats') is not null then
    delete from public.player_match_stats;
  end if;

  if to_regclass('public.match_events') is not null then
    delete from public.match_events;
  end if;

  if to_regclass('public.lineup_players') is not null then
    delete from public.lineup_players;
  end if;

  if to_regclass('public.lineups') is not null then
    delete from public.lineups;
  end if;

  if to_regclass('public.matches') is not null then
    delete from public.matches;
  end if;

  if to_regclass('public.players') is not null then
    delete from public.players;
  end if;

  if to_regclass('public.teams') is not null then
    delete from public.teams;
  end if;
end $$;

commit;
