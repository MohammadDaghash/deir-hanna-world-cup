-- Add Portugal and Egypt players only.
-- No teams, matches, events, lineups, or votes are deleted or inserted here.

begin;

with desired_players (id, team_code, name_en, name_ar, name_he) as (
  values
    ('por-bahaa-daghash', 'POR', 'Bahaa Daghash', 'بهاء دغش', 'בהאא דגש'),
    ('por-azme-salem', 'POR', 'Azme Salem', 'عزمي سالم', 'עזמי סאלם'),
    ('por-ahmad-khateeb', 'POR', 'Ahmad Khateeb', 'احمد خطيب', 'אחמד חטיב'),
    ('por-samer-hamood', 'POR', 'Samer Hamood', 'سامر حمود', 'סאמר חמוד'),
    ('por-mefleh-azzam', 'POR', 'Mefleh Azzam', 'مفلح عزام', 'מפלח עזאם'),
    ('por-ahmad-dhabre', 'POR', 'Ahmad Dhabre', 'احمد دحابره', 'אחמד דחאברה'),
    ('por-basel-khalifa', 'POR', 'Basel Khalifa', 'باسل خليفه', 'באסל חליפה'),
    ('por-razi-abu-alhof', 'POR', 'Razi Abu Alhof', 'رازي ابو الحوف', 'ראזי אבו אלחוף'),
    ('por-rayan-daghash', 'POR', 'Rayan Daghash', 'ريان دغش', 'ריאן דגש'),
    ('por-mohammad-azme-salem', 'POR', 'Mohammad Azme Salem', 'محمد عزمي سالم', 'מוחמד עזמי סאלם'),
    ('egy-mohammad-dokhe', 'EGY', 'Mohammad Dokhe', 'محمد دوخي', 'מוחמד דוחי'),
    ('egy-wael-mresat', 'EGY', 'Wael Mresat', 'وائل مريسات', 'ואאיל מריסאת'),
    ('egy-mohammad-el-eyad', 'EGY', 'Mohammad El Eyad', 'محمد الإياد', 'מוחמד אל איאד'),
    ('egy-hady-abbas', 'EGY', 'Hady Abbas', 'هادي عباس', 'האדי עבאס'),
    ('egy-naseem-daghash', 'EGY', 'Naseem Daghash', 'نسيم دغش', 'נסים דגש'),
    ('egy-wesam-khateeb', 'EGY', 'Wesam Khateeb', 'وسام خطيب', 'וסאם חטיב'),
    ('egy-khaleel-khateeb', 'EGY', 'Khaleel Khateeb', 'خليل خطيب', 'חליל חטיב'),
    ('egy-7abshoosh', 'EGY', '7abshoosh', 'حبشوش', 'חבשוש'),
    ('egy-ward-salem', 'EGY', 'Ward Salem', 'ورد سالم', 'ורד סאלם')
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
    ('por-bahaa-daghash', 'POR', 'Bahaa Daghash', 'بهاء دغش', 'בהאא דגש'),
    ('por-azme-salem', 'POR', 'Azme Salem', 'عزمي سالم', 'עזמי סאלם'),
    ('por-ahmad-khateeb', 'POR', 'Ahmad Khateeb', 'احمد خطيب', 'אחמד חטיב'),
    ('por-samer-hamood', 'POR', 'Samer Hamood', 'سامر حمود', 'סאמר חמוד'),
    ('por-mefleh-azzam', 'POR', 'Mefleh Azzam', 'مفلح عزام', 'מפלח עזאם'),
    ('por-ahmad-dhabre', 'POR', 'Ahmad Dhabre', 'احمد دحابره', 'אחמד דחאברה'),
    ('por-basel-khalifa', 'POR', 'Basel Khalifa', 'باسل خليفه', 'באסל חליפה'),
    ('por-razi-abu-alhof', 'POR', 'Razi Abu Alhof', 'رازي ابو الحوف', 'ראזי אבו אלחוף'),
    ('por-rayan-daghash', 'POR', 'Rayan Daghash', 'ريان دغش', 'ריאן דגש'),
    ('por-mohammad-azme-salem', 'POR', 'Mohammad Azme Salem', 'محمد عزمي سالم', 'מוחמד עזמי סאלם'),
    ('egy-mohammad-dokhe', 'EGY', 'Mohammad Dokhe', 'محمد دوخي', 'מוחמד דוחי'),
    ('egy-wael-mresat', 'EGY', 'Wael Mresat', 'وائل مريسات', 'ואאיל מריסאת'),
    ('egy-mohammad-el-eyad', 'EGY', 'Mohammad El Eyad', 'محمد الإياد', 'מוחמד אל איאד'),
    ('egy-hady-abbas', 'EGY', 'Hady Abbas', 'هادي عباس', 'האדי עבאס'),
    ('egy-naseem-daghash', 'EGY', 'Naseem Daghash', 'نسيم دغش', 'נסים דגש'),
    ('egy-wesam-khateeb', 'EGY', 'Wesam Khateeb', 'وسام خطيب', 'וסאם חטיב'),
    ('egy-khaleel-khateeb', 'EGY', 'Khaleel Khateeb', 'خليل خطيب', 'חליל חטיב'),
    ('egy-7abshoosh', 'EGY', '7abshoosh', 'حبشوش', 'חבשוש'),
    ('egy-ward-salem', 'EGY', 'Ward Salem', 'ورد سالم', 'ורד סאלם')
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
