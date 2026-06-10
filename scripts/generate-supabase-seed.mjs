import {
  lineups,
  matches,
  knockoutMatches,
  players,
  teams,
} from '../src/data/tournament.js'

function sqlString(value) {
  if (value === null || value === undefined || value === '') {
    return 'null'
  }

  return `'${String(value).replaceAll("'", "''")}'`
}

function sqlNumber(value) {
  return Number.isFinite(Number(value)) ? String(Number(value)) : 'null'
}

function values(rows) {
  return rows.join(',\n')
}

const allMatches = [...matches, ...knockoutMatches]

console.log('-- Generated seed data for Deir Hanna Local World Cup')
console.log('-- Run supabase/schema.sql first, then this output in the Supabase SQL editor.')
console.log('begin;')

console.log(`
insert into public.teams (id, country, code, group_code, color, secondary, sort_order)
values
${values(
  teams.map(
    (team, index) =>
      `(${sqlString(team.id)}, ${sqlString(team.country)}, ${sqlString(team.code)}, ${sqlString(team.group)}, ${sqlString(team.color)}, ${sqlString(team.secondary)}, ${index})`,
  ),
)}
on conflict (id) do update set
  country = excluded.country,
  code = excluded.code,
  group_code = excluded.group_code,
  color = excluded.color,
  secondary = excluded.secondary,
  sort_order = excluded.sort_order;
`)

console.log(`
insert into public.players (id, team_id, name, number, position, goals, assists, yellow_cards, red_cards)
values
${values(
  players.map(
    (player) =>
      `(${sqlString(player.id)}, ${sqlString(player.teamId)}, ${sqlString(player.name)}, ${sqlNumber(player.number)}, ${sqlString(player.position)}, ${sqlNumber(player.goals)}, ${sqlNumber(player.assists)}, ${sqlNumber(player.yellowCards)}, ${sqlNumber(player.redCards)})`,
  ),
)}
on conflict (id) do update set
  team_id = excluded.team_id,
  name = excluded.name,
  number = excluded.number,
  position = excluded.position,
  goals = excluded.goals,
  assists = excluded.assists,
  yellow_cards = excluded.yellow_cards,
  red_cards = excluded.red_cards;
`)

console.log(`
insert into public.matches (
  id, stage, group_code, matchday, date, time, venue,
  home_team_id, away_team_id, home_label, away_label,
  home_score, away_score, status, minute
)
values
${values(
  allMatches.map(
    (match) =>
      `(${sqlString(match.id)}, ${sqlString(match.stage)}, ${sqlString(match.group)}, ${sqlNumber(match.matchday)}, ${sqlString(match.date)}, ${sqlString(match.time)}, ${sqlString(match.venue)}, ${sqlString(match.homeTeamId)}, ${sqlString(match.awayTeamId)}, ${sqlString(match.homeLabel)}, ${sqlString(match.awayLabel)}, ${sqlNumber(match.homeScore)}, ${sqlNumber(match.awayScore)}, ${sqlString(match.status)}, ${sqlNumber(match.minute)})`,
  ),
)}
on conflict (id) do update set
  stage = excluded.stage,
  group_code = excluded.group_code,
  matchday = excluded.matchday,
  date = excluded.date,
  time = excluded.time,
  venue = excluded.venue,
  home_team_id = excluded.home_team_id,
  away_team_id = excluded.away_team_id,
  home_label = excluded.home_label,
  away_label = excluded.away_label,
  home_score = excluded.home_score,
  away_score = excluded.away_score,
  status = excluded.status,
  minute = excluded.minute;
`)

console.log('delete from public.match_events;')
const eventRows = allMatches.flatMap((match) =>
  (match.events ?? []).map((event, index) =>
    `(${sqlString(match.id)}, ${sqlNumber(event.minute)}, ${sqlString(event.type)}, ${sqlString(event.teamId)}, ${sqlString(event.player)}, ${sqlString(event.assist)}, ${index})`,
  ),
)

if (eventRows.length) {
  console.log(`
insert into public.match_events (match_id, minute, type, team_id, player, assist, sort_order)
values
${values(eventRows)};
`)
}

console.log('delete from public.lineup_players;')
console.log('delete from public.lineups;')

for (const [matchId, matchLineups] of Object.entries(lineups)) {
  for (const side of ['home', 'away']) {
    const lineup = matchLineups[side]

    if (!lineup) {
      continue
    }

    console.log(`
with inserted_lineup as (
  insert into public.lineups (match_id, side, formation)
  values (${sqlString(matchId)}, ${sqlString(side)}, ${sqlString(lineup.formation)})
  on conflict (match_id, side) do update set formation = excluded.formation
  returning id
)
insert into public.lineup_players (lineup_id, player_id, role, slot)
select id, player_id, role, slot
from inserted_lineup,
(values
${values([
  ...lineup.starters.map(
    (playerId, index) => `(${sqlString(playerId)}, 'starter', ${index})`,
  ),
  ...lineup.bench.map((playerId, index) => `(${sqlString(playerId)}, 'bench', ${index})`),
])}
) as lineup_player_values(player_id, role, slot)
on conflict do nothing;
`)
  }
}

console.log('commit;')
