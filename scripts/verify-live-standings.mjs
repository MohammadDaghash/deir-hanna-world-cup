import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { tournamentFormat } from '../src/config/tournamentFormat.js'
import { calculateStandings } from '../src/utils/tournament.js'

const teams = [
  { id: 'albania', country: 'Albania', code: 'ALB' },
  { id: 'qatar', country: 'Qatar', code: 'QAT' },
  { id: 'morocco', country: 'Morocco', code: 'MAR' },
  { id: 'portugal', country: 'Portugal', code: 'POR' },
]

function groupMatch(id, homeTeamId, awayTeamId, homeScore, awayScore, status = 'final') {
  return {
    id,
    date: '2026-06-20',
    group: 'A',
    homeScore,
    homeTeamId,
    awayScore,
    awayTeamId,
    stage: tournamentFormat.stages.group,
    status,
    time: '19:30',
  }
}

const standings = calculateStandings(teams, [
  groupMatch('final-1', 'albania', 'morocco', 1, 0),
  groupMatch('live-1', 'qatar', 'portugal', 2, 1, 'live'),
]).A

const qatar = standings.find((row) => row.team.id === 'qatar')
const portugal = standings.find((row) => row.team.id === 'portugal')
const albania = standings.find((row) => row.team.id === 'albania')

assert.equal(qatar.played, 1, 'live winner should receive provisional played match')
assert.equal(qatar.won, 1, 'live winner should receive provisional win')
assert.equal(qatar.goalsFor, 2, 'live winner should receive provisional goals for')
assert.equal(qatar.goalsAgainst, 1, 'live winner should receive provisional goals against')
assert.equal(qatar.goalDifference, 1, 'live winner should receive provisional goal difference')
assert.equal(qatar.points, 3, 'live winner should receive provisional three points')
assert.equal(qatar.live, true, 'live team should be marked live')
assert.equal(qatar.provisional, true, 'live team should be marked provisional')
assert.deepEqual(qatar.liveMatchIds, ['live-1'], 'live team should expose live match id')

assert.equal(portugal.played, 1, 'live loser should receive provisional played match')
assert.equal(portugal.lost, 1, 'live loser should receive provisional loss')
assert.equal(portugal.points, 0, 'live loser should receive zero provisional points')
assert.equal(portugal.live, true, 'live opponent should be marked live')

assert.ok(
  standings.findIndex((row) => row.team.id === 'qatar') <
    standings.findIndex((row) => row.team.id === 'albania'),
  'sorting should update from provisional live score',
)

const nilNilStandings = calculateStandings(teams, [
  groupMatch('live-2', 'qatar', 'portugal', undefined, undefined, 'live'),
]).A
const nilNilQatar = nilNilStandings.find((row) => row.team.id === 'qatar')
const nilNilPortugal = nilNilStandings.find((row) => row.team.id === 'portugal')

assert.equal(nilNilQatar.drawn, 1, '0-0 live match should be provisional draw for Team 1')
assert.equal(nilNilQatar.points, 1, '0-0 live match should give Team 1 one provisional point')
assert.equal(nilNilPortugal.drawn, 1, '0-0 live match should be provisional draw for Team 2')
assert.equal(nilNilPortugal.points, 1, '0-0 live match should give Team 2 one provisional point')

const finalOnly = calculateStandings(teams, [
  groupMatch('final-2', 'qatar', 'portugal', 2, 1),
]).A

assert.equal(finalOnly.some((row) => row.live), false, 'finished matches should not mark teams live')
assert.equal(finalOnly.some((row) => row.provisional), false, 'finished matches should not mark standings provisional')

const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const localizationSource = readFileSync(new URL('../src/utils/localization.js', import.meta.url), 'utf8')

assert.ok(appSource.includes('function LiveTeamBadge'), 'standings UI should render a reusable live badge')
assert.ok(
  appSource.includes('ui.liveTableProvisional'),
  'standings UI should render the translated provisional label',
)
assert.ok(
  appSource.includes('row.live && <LiveTeamBadge'),
  'standings rows should show live badges for currently playing teams',
)
assert.equal(
  localizationSource.match(/liveTableProvisional:/g)?.length,
  3,
  'live provisional table label should be translated in EN, HE, and AR',
)

console.log('live standings checks passed')
