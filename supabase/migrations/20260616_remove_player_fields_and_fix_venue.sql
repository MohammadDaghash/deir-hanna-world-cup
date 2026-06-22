-- Remove public/admin dependency on player numbers and positions.
-- Keep the columns for backward compatibility, but make them optional.
-- Force the single tournament venue for every existing and future app write.
-- Production safety note: this migration does not delete match rows.

begin;

alter table public.players alter column number drop not null;
alter table public.players alter column position drop not null;
alter table public.players alter column number drop default;
alter table public.players alter column position drop default;

update public.matches
set venue = 'El Capitano Stadium - Deir Hanna',
    venue_en = 'El Capitano Stadium - Deir Hanna',
    venue_he = 'אצטדיון אל קפיטנו - דיר חנא',
    venue_ar = 'ملعب الكابيتانو ديرحنا (السهل)';

commit;
