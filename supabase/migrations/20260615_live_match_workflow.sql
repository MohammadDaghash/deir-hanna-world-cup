-- Add live match workflow fields without removing existing event text data.

begin;

alter table public.matches add column if not exists match_start_time timestamptz;
alter table public.matches add column if not exists match_end_time timestamptz;
alter table public.matches add column if not exists match_phase text not null default 'scheduled';
alter table public.matches add column if not exists phase_started_at timestamptz;
alter table public.matches add column if not exists pause_started_at timestamptz;
alter table public.matches add column if not exists phase_paused_seconds int not null default 0;
alter table public.matches add column if not exists previous_phase text;
alter table public.matches add column if not exists first_half_start_time timestamptz;
alter table public.matches add column if not exists first_half_end_time timestamptz;
alter table public.matches add column if not exists second_half_start_time timestamptz;
alter table public.matches add column if not exists second_half_end_time timestamptz;

alter table public.match_events add column if not exists event_type text not null default 'goal';
alter table public.match_events add column if not exists event_phase text;
alter table public.match_events add column if not exists display_minute text;
alter table public.match_events add column if not exists player_id text references public.players(id) on delete set null;
alter table public.match_events add column if not exists assist_player_id text references public.players(id) on delete set null;

update public.match_events
set event_type = coalesce(nullif(event_type, ''), type, 'goal');

commit;
