-- Add France, Algeria, and Albania players only.
-- This file intentionally does not delete or create teams, matches, events, lineups, or votes.

begin;

with desired_players (id, team_code, name_en, name_ar, name_he) as (
  values
    ('fra-obaida-dhabre', 'FRA', 'Obaida Dhabre', 'عبيدة دحابرة', 'עוביידה דחאברה'),
    ('fra-mohammad-dhabre', 'FRA', 'Mohammad Dhabre', 'محمد دحابرة', 'מוחמד דחאברה'),
    ('fra-ameer-taha', 'FRA', 'Ameer Taha', 'امير طه', 'אמיר טאהא'),
    ('fra-basel-khoury', 'FRA', 'Basel Khoury', 'باسل خوري', 'באסל חורי'),
    ('fra-yuhanna-mouallem', 'FRA', 'Yuhanna Mouallem', 'يوحنا معلم', 'יוחנא מועלם'),
    ('fra-boulos-mouallem', 'FRA', 'Boulos Mouallem', 'بولص معلم', 'בולוס מועלם'),
    ('fra-yazan-hajjo', 'FRA', 'Yazan Hajjo', 'يزن حجو', 'יזן חגו'),
    ('fra-ibraheem-mouallem', 'FRA', 'Ibraheem Mouallem', 'ابراهيم معلم', 'אבראהים מועלם'),
    ('fra-waseem-hannawe', 'FRA', 'Waseem Hannawe', 'وسيم حناوي', 'וסים חנאוי'),
    ('alg-mohammad-hamood', 'ALG', 'Mohammad Hamood', 'محمد حمود', 'מוחמד חמוד'),
    ('alg-mohammad-khateeb', 'ALG', 'Mohammad Khateeb', 'محمد خطيب', 'מוחמד חטיב'),
    ('alg-mohammad-hussien', 'ALG', 'Mohammad Hussien', 'محمد حسين', 'מוחמד חוסיין'),
    ('alg-ali-hussien', 'ALG', 'Ali Hussien', 'علي حسين', 'עלי חוסיין'),
    ('alg-yazan-hussien', 'ALG', 'Yazan Hussien', 'يزن حسين', 'יזן חוסיין'),
    ('alg-firas-taha', 'ALG', 'Firas Taha', 'فراس طه', 'פיראס טאהא'),
    ('alg-anas-khateeb', 'ALG', 'Anas Khateeb', 'انس خطيب', 'אנס חטיב'),
    ('alg-waheed-salem', 'ALG', 'Waheed Salem', 'وحيد سالم', 'וחיד סאלם'),
    ('alg-mohammad-arshed', 'ALG', 'Mohammad Arshed', 'محمد ارشيد', 'מוחמד ארשיד'),
    ('alg-sabri-rabah', 'ALG', 'Sabri Rabah', 'صبري رباح', 'סברי רבאח'),
    ('alb-julian-hannawe', 'ALB', 'Julian Hannawe', 'جوليان حناوي', 'גוליאן חנאוי'),
    ('alb-zain-ali', 'ALB', 'Zain Ali', 'زين علي', 'זין עלי'),
    ('alb-marcus-ashkar', 'ALB', 'Marcus Ashkar', 'مرقص اشقر', 'מרקוס אשקר'),
    ('alb-kenan-khalaily', 'ALB', 'Kenan Khalaily', 'كنان خلايلة', 'קנאן חלאילה'),
    ('alb-ayham-hussien', 'ALB', 'Ayham Hussien', 'أيهم حسين', 'אייהם חוסיין'),
    ('alb-khaled-hussien', 'ALB', 'Khaled Hussien', 'خالد حسين', 'חאלד חוסיין'),
    ('alb-fouad-khoury', 'ALB', 'Fouad Khoury', 'فؤاد خوري', 'פואד חורי'),
    ('alb-salah-dhabre', 'ALB', 'Salah Dhabre', 'صلاح دحابرة', 'סלאח דחאברה'),
    ('alb-mohammad-ragab', 'ALB', 'Mohammad Ragab', 'محمد رجب', 'מוחמד רגב'),
    ('alb-shams-hussien', 'ALB', 'Shams Hussien', 'شمس حسين', 'שמס חוסיין')
)
update public.players as player
set team_id = team.id,
    name = desired.name_en,
    name_en = desired.name_en,
    name_ar = desired.name_ar,
    name_he = desired.name_he,
    number = null,
    position = null,
    updated_at = now()
from desired_players as desired
join public.teams as team on upper(team.code) = desired.team_code
where player.id = desired.id
   or (
     player.team_id = team.id
     and lower(coalesce(nullif(player.name_en, ''), player.name)) = lower(desired.name_en)
   );

with desired_players (id, team_code, name_en, name_ar, name_he) as (
  values
    ('fra-obaida-dhabre', 'FRA', 'Obaida Dhabre', 'عبيدة دحابرة', 'עוביידה דחאברה'),
    ('fra-mohammad-dhabre', 'FRA', 'Mohammad Dhabre', 'محمد دحابرة', 'מוחמד דחאברה'),
    ('fra-ameer-taha', 'FRA', 'Ameer Taha', 'امير طه', 'אמיר טאהא'),
    ('fra-basel-khoury', 'FRA', 'Basel Khoury', 'باسل خوري', 'באסל חורי'),
    ('fra-yuhanna-mouallem', 'FRA', 'Yuhanna Mouallem', 'يوحنا معلم', 'יוחנא מועלם'),
    ('fra-boulos-mouallem', 'FRA', 'Boulos Mouallem', 'بولص معلم', 'בולוס מועלם'),
    ('fra-yazan-hajjo', 'FRA', 'Yazan Hajjo', 'يزن حجو', 'יזן חגו'),
    ('fra-ibraheem-mouallem', 'FRA', 'Ibraheem Mouallem', 'ابراهيم معلم', 'אבראהים מועלם'),
    ('fra-waseem-hannawe', 'FRA', 'Waseem Hannawe', 'وسيم حناوي', 'וסים חנאוי'),
    ('alg-mohammad-hamood', 'ALG', 'Mohammad Hamood', 'محمد حمود', 'מוחמד חמוד'),
    ('alg-mohammad-khateeb', 'ALG', 'Mohammad Khateeb', 'محمد خطيب', 'מוחמד חטיב'),
    ('alg-mohammad-hussien', 'ALG', 'Mohammad Hussien', 'محمد حسين', 'מוחמד חוסיין'),
    ('alg-ali-hussien', 'ALG', 'Ali Hussien', 'علي حسين', 'עלי חוסיין'),
    ('alg-yazan-hussien', 'ALG', 'Yazan Hussien', 'يزن حسين', 'יזן חוסיין'),
    ('alg-firas-taha', 'ALG', 'Firas Taha', 'فراس طه', 'פיראס טאהא'),
    ('alg-anas-khateeb', 'ALG', 'Anas Khateeb', 'انس خطيب', 'אנס חטיב'),
    ('alg-waheed-salem', 'ALG', 'Waheed Salem', 'وحيد سالم', 'וחיד סאלם'),
    ('alg-mohammad-arshed', 'ALG', 'Mohammad Arshed', 'محمد ارشيد', 'מוחמד ארשיד'),
    ('alg-sabri-rabah', 'ALG', 'Sabri Rabah', 'صبري رباح', 'סברי רבאח'),
    ('alb-julian-hannawe', 'ALB', 'Julian Hannawe', 'جوليان حناوي', 'גוליאן חנאוי'),
    ('alb-zain-ali', 'ALB', 'Zain Ali', 'زين علي', 'זין עלי'),
    ('alb-marcus-ashkar', 'ALB', 'Marcus Ashkar', 'مرقص اشقر', 'מרקוס אשקר'),
    ('alb-kenan-khalaily', 'ALB', 'Kenan Khalaily', 'كنان خلايلة', 'קנאן חלאילה'),
    ('alb-ayham-hussien', 'ALB', 'Ayham Hussien', 'أيهم حسين', 'אייהם חוסיין'),
    ('alb-khaled-hussien', 'ALB', 'Khaled Hussien', 'خالد حسين', 'חאלד חוסיין'),
    ('alb-fouad-khoury', 'ALB', 'Fouad Khoury', 'فؤاد خوري', 'פואד חורי'),
    ('alb-salah-dhabre', 'ALB', 'Salah Dhabre', 'صلاح دحابرة', 'סלאח דחאברה'),
    ('alb-mohammad-ragab', 'ALB', 'Mohammad Ragab', 'محمد رجب', 'מוחמד רגב'),
    ('alb-shams-hussien', 'ALB', 'Shams Hussien', 'شمس حسين', 'שמס חוסיין')
)
insert into public.players (
  id,
  team_id,
  name,
  name_en,
  name_ar,
  name_he,
  number,
  position,
  goals,
  assists,
  yellow_cards,
  red_cards
)
select desired.id,
       team.id,
       desired.name_en,
       desired.name_en,
       desired.name_ar,
       desired.name_he,
       null,
       null,
       0,
       0,
       0,
       0
from desired_players as desired
join public.teams as team on upper(team.code) = desired.team_code
where not exists (
  select 1
  from public.players as player
  where player.id = desired.id
     or (
       player.team_id = team.id
       and lower(coalesce(nullif(player.name_en, ''), player.name)) = lower(desired.name_en)
     )
);

commit;
