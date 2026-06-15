-- Remove public/admin dependency on player numbers and positions.
-- Keep the columns for backward compatibility, but make them optional.
-- Force the single tournament venue for every existing and future app write.

begin;

alter table public.players alter column number drop not null;
alter table public.players alter column position drop not null;
alter table public.players alter column number drop default;
alter table public.players alter column position drop default;

update public.matches
set venue = 'El Maracana Stadium - Deir Hanna',
    venue_en = 'El Maracana Stadium - Deir Hanna',
    venue_he = 'El Maracana Stadium - Deir Hanna',
    venue_ar = 'El Maracana Stadium - Deir Hanna';

delete from public.matches
where stage = 'Third place';

commit;
