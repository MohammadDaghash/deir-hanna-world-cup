import {
  lineups,
  matches,
  knockoutMatches,
  players,
  teams,
} from '../src/data/tournament.js'
import { tournamentFormat } from '../src/config/tournamentFormat.js'

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
const teamIds = teams.map((team) => team.id)
const playerIds = players.map((player) => player.id)
const matchIds = allMatches.map((match) => match.id)
const fixedVenueEn = sqlString(tournamentFormat.fixedVenueEn)
const fixedVenueHe = sqlString(tournamentFormat.fixedVenueHe)
const fixedVenueAr = sqlString(tournamentFormat.fixedVenueAr)

console.log('-- Generated seed data for Deir Hanna Local World Cup')
console.log('-- Run supabase/schema.sql first, then this output in the Supabase SQL editor.')

if (!teams.length && !players.length && !allMatches.length) {
  console.log('-- No seed rows configured.')
  console.log('-- This seed file is intentionally a no-op so manually entered tournament data is not deleted.')
  console.log('begin;')
  console.log('commit;')
  process.exit(0)
}

console.log('begin;')
console.log('-- Safe seed mode: upsert rows only. Existing production rows are never deleted.')

console.log(`
insert into public.teams (id, country, country_en, country_he, country_ar, code, group_code, color, secondary, sort_order)
values
${values(
  teams.map(
    (team, index) =>
      `(${sqlString(team.id)}, ${sqlString(team.countryEn ?? team.country)}, ${sqlString(team.countryEn ?? team.country)}, ${sqlString(team.countryHe)}, ${sqlString(team.countryAr)}, ${sqlString(team.code)}, ${sqlString(team.group)}, ${sqlString(team.color)}, ${sqlString(team.secondary)}, ${index})`,
  ),
)}
on conflict (id) do update set
  country = excluded.country,
  country_en = excluded.country_en,
  country_he = excluded.country_he,
  country_ar = excluded.country_ar,
  code = excluded.code,
  group_code = excluded.group_code,
  color = excluded.color,
  secondary = excluded.secondary,
  sort_order = excluded.sort_order;
`)

console.log(`
insert into public.players (id, team_id, name, name_en, name_he, name_ar, goals, assists, yellow_cards, red_cards)
values
${values(
  players.map(
    (player) =>
      `(${sqlString(player.id)}, ${sqlString(player.teamId)}, ${sqlString(player.nameEn ?? player.name)}, ${sqlString(player.nameEn ?? player.name)}, ${sqlString(player.nameHe)}, ${sqlString(player.nameAr)}, ${sqlNumber(player.goals)}, ${sqlNumber(player.assists)}, ${sqlNumber(player.yellowCards)}, ${sqlNumber(player.redCards)})`,
  ),
)}
on conflict (id) do update set
  team_id = excluded.team_id,
  name = excluded.name,
  name_en = excluded.name_en,
  name_he = excluded.name_he,
  name_ar = excluded.name_ar,
  goals = excluded.goals,
  assists = excluded.assists,
  yellow_cards = excluded.yellow_cards,
  red_cards = excluded.red_cards;
`)

console.log(`
insert into public.matches (
  id, stage, group_code, matchday, date, time, venue, venue_en, venue_he, venue_ar,
  home_team_id, away_team_id, home_label, away_label,
  home_score, away_score, status, minute,
  match_phase, phase_started_at, pause_started_at, phase_paused_seconds, previous_phase,
  match_start_time, match_end_time, first_half_start_time, first_half_end_time,
  second_half_start_time, second_half_end_time
)
values
${values(
  allMatches.map(
    (match) =>
      `(${sqlString(match.id)}, ${sqlString(match.stage)}, ${sqlString(match.group)}, ${sqlNumber(match.matchday)}, ${sqlString(match.date)}, ${sqlString(match.time)}, ${fixedVenueEn}, ${fixedVenueEn}, ${fixedVenueHe}, ${fixedVenueAr}, ${sqlString(match.homeTeamId)}, ${sqlString(match.awayTeamId)}, ${sqlString(match.homeLabel)}, ${sqlString(match.awayLabel)}, ${sqlNumber(match.homeScore)}, ${sqlNumber(match.awayScore)}, ${sqlString(match.status)}, ${sqlNumber(match.minute)}, ${sqlString(match.matchPhase)}, ${sqlString(match.phaseStartedAt)}, ${sqlString(match.pauseStartedAt)}, ${sqlNumber(match.phasePausedSeconds)}, ${sqlString(match.previousPhase)}, ${sqlString(match.matchStartTime)}, ${sqlString(match.matchEndTime)}, ${sqlString(match.firstHalfStartTime)}, ${sqlString(match.firstHalfEndTime)}, ${sqlString(match.secondHalfStartTime)}, ${sqlString(match.secondHalfEndTime)})`,
  ),
)}
on conflict (id) do update set
  stage = excluded.stage,
  group_code = excluded.group_code,
  matchday = excluded.matchday,
  date = excluded.date,
  time = excluded.time,
  venue = excluded.venue,
  venue_en = excluded.venue_en,
  venue_he = excluded.venue_he,
  venue_ar = excluded.venue_ar,
  home_team_id = excluded.home_team_id,
  away_team_id = excluded.away_team_id,
  home_label = excluded.home_label,
  away_label = excluded.away_label,
  home_score = excluded.home_score,
  away_score = excluded.away_score,
  status = excluded.status,
  minute = excluded.minute,
  match_phase = excluded.match_phase,
  phase_started_at = excluded.phase_started_at,
  pause_started_at = excluded.pause_started_at,
  phase_paused_seconds = excluded.phase_paused_seconds,
  previous_phase = excluded.previous_phase,
  match_start_time = excluded.match_start_time,
  match_end_time = excluded.match_end_time,
  first_half_start_time = excluded.first_half_start_time,
  first_half_end_time = excluded.first_half_end_time,
  second_half_start_time = excluded.second_half_start_time,
  second_half_end_time = excluded.second_half_end_time;
`)

const eventRows = allMatches.flatMap((match) =>
  (match.events ?? []).map((event, index) =>
    `(${sqlString(match.id)}, ${sqlNumber(event.minute)}, ${sqlString(event.eventPhase)}, ${sqlString(event.displayMinute)}, ${sqlString(event.type)}, ${sqlString(event.type)}, ${sqlString(event.teamId)}, ${sqlString(event.playerId)}, ${sqlString(event.player)}, ${sqlString(event.assistPlayerId)}, ${sqlString(event.assist)}, ${index})`,
  ),
)

if (eventRows.length) {
  console.log(`
insert into public.match_events (match_id, minute, event_phase, display_minute, type, event_type, team_id, player_id, player, assist_player_id, assist, sort_order)
values
${values(eventRows)};
`)
}

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
