-- Add an additional approved admin without changing existing admin users.

begin;

insert into public.admin_users (email)
values ('a.a.sportive@gmail.com')
on conflict (email) do nothing;

commit;
