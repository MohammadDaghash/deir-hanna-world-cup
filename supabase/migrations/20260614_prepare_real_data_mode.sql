-- Prepare the tournament database for real organizer data.
-- Production safety note:
-- This migration is now additive only. Old demo cleanup logic was removed so
-- manually entered teams, players, matches, events, votes, and admin users
-- cannot be deleted by accidentally rerunning local migration files.

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

commit;
