import assert from 'node:assert/strict'

import {
  getTeamGroupCode,
  knockoutStageFilters,
  roundFilterOptions,
  stageOptions,
  tournamentFormat,
} from '../src/config/tournamentFormat.js'
import { matches, knockoutMatches } from '../src/data/tournament.js'
import { calculateStandings } from '../src/utils/tournament.js'

assert.equal(tournamentFormat.teamCount, 8, 'tournament should have 8 teams')
assert.deepEqual(tournamentFormat.groupKeys, ['A', 'B'], 'tournament should use Group A and Group B')
assert.equal(tournamentFormat.teamsPerGroup, 4, 'each group should have 4 teams')
assert.equal(tournamentFormat.qualifyingTeamsPerGroup, 2, 'top two from each group should qualify')
assert.equal(tournamentFormat.groupStageRounds, 3, 'group stage should have three rounds')
assert.equal(tournamentFormat.qualifyingTeams, 4, 'four teams qualify total')
assert.equal(tournamentFormat.stages.thirdPlace, 'Third place', 'third-place stage should be supported')

assert.equal(getTeamGroupCode({ country: 'Albania' }), 'A', 'Albania should be assigned to Group A')
assert.equal(getTeamGroupCode({ country: 'Qatar' }), 'A', 'Qatar should be assigned to Group A')
assert.equal(getTeamGroupCode({ country: 'Morocco' }), 'A', 'Morocco should be assigned to Group A')
assert.equal(getTeamGroupCode({ country: 'Portugal' }), 'A', 'Portugal should be assigned to Group A')
assert.equal(getTeamGroupCode({ country: 'Brazil' }), 'B', 'all remaining teams should be assigned to Group B')

assert.ok(stageOptions.some((stage) => stage.value === tournamentFormat.stages.group), 'stage options should include group stage')
assert.ok(stageOptions.some((stage) => stage.value === tournamentFormat.stages.thirdPlace), 'stage options should include third place')
assert.ok(knockoutStageFilters.some((stage) => stage.id === tournamentFormat.stages.thirdPlace), 'knockout filters should include third place')
assert.equal(roundFilterOptions.filter((round) => round.id.startsWith('group-')).length, 3, 'round filters should expose 3 group-stage rounds')

assert.equal(matches.length, 0, 'group-stage fixtures must remain manual/empty')
assert.equal(knockoutMatches.length, 0, 'knockout fixtures must remain manual/empty')

const teams = [
  { id: 'albania', country: 'Albania' },
  { id: 'qatar', country: 'Qatar' },
  { id: 'morocco', country: 'Morocco' },
  { id: 'portugal', country: 'Portugal' },
  { id: 'brazil', country: 'Brazil' },
  { id: 'argentina', country: 'Argentina' },
  { id: 'japan', country: 'Japan' },
  { id: 'germany', country: 'Germany' },
]

const standings = calculateStandings(teams, [
  {
    id: 'a1',
    stage: tournamentFormat.stages.group,
    group: 'A',
    homeTeamId: 'albania',
    awayTeamId: 'qatar',
    homeScore: 2,
    awayScore: 0,
    status: 'final',
  },
  {
    id: 'b1',
    stage: tournamentFormat.stages.group,
    group: 'B',
    homeTeamId: 'brazil',
    awayTeamId: 'argentina',
    homeScore: 1,
    awayScore: 0,
    status: 'final',
  },
])

assert.equal(standings.A.length, 4, 'Group A standings should include exactly 4 teams')
assert.equal(standings.B.length, 4, 'Group B standings should include exactly 4 teams')
assert.equal(standings.A.filter((row) => row.qualified).length, 2, 'Group A should qualify top 2')
assert.equal(standings.B.filter((row) => row.qualified).length, 2, 'Group B should qualify top 2')
assert.equal(standings.A[0].team.id, 'albania', 'Group A should sort independently')
assert.equal(standings.B[0].team.id, 'brazil', 'Group B should sort independently')

console.log('final tournament format checks passed')
