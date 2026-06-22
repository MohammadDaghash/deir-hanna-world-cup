-- Repair legacy match_events rows where event_type kept the default "goal"
-- while the legacy type column contains the actual event type.

begin;

update public.match_events
set event_type = type
where event_type = 'goal'
  and type is not null
  and type <> 'goal';

commit;
