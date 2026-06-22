import assert from 'node:assert/strict'
import { tournamentFormat } from '../src/config/tournamentFormat.js'
import { calculateStandings } from '../src/utils/tournament.js'

const teams = [
  { id: 'albania', country: 'Albania', code: 'ALB' },
  { id: 'qatar', country: 'Qatar', code: 'QAT' },
  { id: 'morocco', country: 'Morocco', code: 'MAR' },
  { id: 'portugal', country: 'Portugal', code: 'POR' },
]

function finalMatch(id, homeTeamId, awayTeamId, homeScore, awayScore) {
  return {
    id,
    date: '2026-06-20',
    time: id.padStart(5, '0'),
    stage: tournamentFormat.stages.group,
    status: 'final',
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore,
  }
}

const headToHeadRows = calculateStandings(teams, [
  finalMatch('1', 'qatar', 'albania', 1, 0),
  finalMatch('2', 'albania', 'portugal', 1, 0),
  finalMatch('3', 'qatar', 'morocco', 0, 1),
]).A

assert.ok(
  headToHeadRows.findIndex((row) => row.team.id === 'qatar') <
    headToHeadRows.findIndex((row) => row.team.id === 'albania'),
  'head-to-head winner should rank above the tied opponent',
)

const rematchRows = calculateStandings(teams, [
  finalMatch('1', 'albania', 'portugal', 1, 0),
  finalMatch('2', 'qatar', 'morocco', 0, 0),
]).A

const boundaryRows = rematchRows.filter((row) => row.rematchRequired)

assert.deepEqual(
  boundaryRows.map((row) => row.team.id).sort(),
  ['morocco', 'qatar'],
  'teams tied across the qualification boundary after a drawn head-to-head should require rematch',
)
assert.ok(
  boundaryRows.every((row) => row.rematchReason === 'Qualification requires rematch.'),
  'rematch rows should expose the public note',
)

console.log('tiebreaker checks passed')
