-- Update the fixed venue labels and allow approved admins to invite more admins.

begin;

update public.matches
set venue = 'El Capitano Stadium - Deir Hanna',
    venue_en = 'El Capitano Stadium - Deir Hanna',
    venue_he = 'אצטדיון אל קפיטנו - דיר חנא',
    venue_ar = 'ملعب الكابيتانو ديرحنا (السهل)';

drop policy if exists "Admins can invite admin users" on public.admin_users;
create policy "Admins can invite admin users"
on public.admin_users for insert
with check (public.is_admin());

commit;
