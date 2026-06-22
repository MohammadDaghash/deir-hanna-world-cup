-- Re-add the final 8 tournament teams only.
-- This migration intentionally does not insert, update, or delete players, matches, events, lineups, or votes.
-- Existing team IDs are preserved by updating rows matched by team code.

begin;

with desired_teams (id, country_en, country_ar, country_he, code, group_code, sort_order) as (
  values
    ('alb', 'Albania', 'ألبانيا', 'אלבניה', 'ALB', 'A', 1),
    ('qat', 'Qatar', 'قطر', 'קטאר', 'QAT', 'A', 2),
    ('mar', 'Morocco', 'المغرب', 'מרוקו', 'MAR', 'A', 3),
    ('por', 'Portugal', 'البرتغال', 'פורטוגל', 'POR', 'A', 4),
    ('alg', 'Algeria', 'الجزائر', 'אלג׳יריה', 'ALG', 'B', 5),
    ('egy', 'Egypt', 'مصر', 'מצרים', 'EGY', 'B', 6),
    ('fra', 'France', 'فرنسا', 'צרפת', 'FRA', 'B', 7),
    ('tur', 'Turkey', 'تركيا', 'טורקיה', 'TUR', 'B', 8)
)
update public.teams as team
set country = desired.country_en,
    country_en = desired.country_en,
    country_ar = desired.country_ar,
    country_he = desired.country_he,
    code = desired.code,
    group_code = desired.group_code,
    sort_order = desired.sort_order,
    updated_at = now()
from desired_teams as desired
where upper(team.code) = desired.code;

with desired_teams (id, country_en, country_ar, country_he, code, group_code, sort_order) as (
  values
    ('alb', 'Albania', 'ألبانيا', 'אלבניה', 'ALB', 'A', 1),
    ('qat', 'Qatar', 'قطر', 'קטאר', 'QAT', 'A', 2),
    ('mar', 'Morocco', 'المغرب', 'מרוקו', 'MAR', 'A', 3),
    ('por', 'Portugal', 'البرتغال', 'פורטוגל', 'POR', 'A', 4),
    ('alg', 'Algeria', 'الجزائر', 'אלג׳יריה', 'ALG', 'B', 5),
    ('egy', 'Egypt', 'مصر', 'מצרים', 'EGY', 'B', 6),
    ('fra', 'France', 'فرنسا', 'צרפת', 'FRA', 'B', 7),
    ('tur', 'Turkey', 'تركيا', 'טורקיה', 'TUR', 'B', 8)
)
insert into public.teams (
  id,
  country,
  country_en,
  country_ar,
  country_he,
  code,
  group_code,
  color,
  secondary,
  sort_order
)
select desired.id,
       desired.country_en,
       desired.country_en,
       desired.country_ar,
       desired.country_he,
       desired.code,
       desired.group_code,
       '#1f6d4d',
       '#eef3e9',
       desired.sort_order
from desired_teams as desired
where not exists (
  select 1
  from public.teams as team
  where upper(team.code) = desired.code
);

commit;
