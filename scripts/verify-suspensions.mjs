import assert from 'node:assert/strict'
import { liveEventTypes } from '../src/utils/liveMatch.js'
import { calculateSuspensions, getPlayerSuspension } from '../src/utils/tournament.js'

const players = [
  { id: 'p1', name: 'Two Yellow Player', teamId: 'team-a' },
  { id: 'p2', name: 'Red Card Player', teamId: 'team-a' },
  { id: 'p3', name: 'Available Player', teamId: 'team-a' },
]

const baseMatches = [
  {
    id: 'match-1',
    date: '2026-06-20',
    time: '18:00',
    status: 'final',
    homeTeamId: 'team-a',
    awayTeamId: 'team-b',
    events: [
      { type: liveEventTypes.yellowCard, player: 'Two Yellow Player', teamId: 'team-a', minute: 5 },
    ],
  },
  {
    id: 'match-2',
    date: '2026-06-21',
    time: '18:00',
    status: 'final',
    homeTeamId: 'team-c',
    awayTeamId: 'team-a',
    events: [
      { type: liveEventTypes.yellowCard, playerId: 'p1', teamId: 'team-a', minute: 8 },
      { type: liveEventTypes.redCard, playerId: 'p2', teamId: 'team-a', minute: 17 },
    ],
  },
  {
    id: 'match-3',
    date: '2026-06-22',
    time: '18:00',
    status: 'scheduled',
    homeTeamId: 'team-a',
    awayTeamId: 'team-d',
    events: [],
  },
]

const activeSuspensions = calculateSuspensions(players, baseMatches)
const yellowSuspension = getPlayerSuspension(activeSuspensions, 'p1')
const redSuspension = getPlayerSuspension(activeSuspensions, 'p2')
const availablePlayer = getPlayerSuspension(activeSuspensions, 'p3')

assert.equal(yellowSuspension.suspended, true)
assert.equal(yellowSuspension.matchId, 'match-3')
assert.deepEqual(yellowSuspension.reasons, ['2 yellow cards'])
assert.equal(redSuspension.suspended, true)
assert.equal(redSuspension.matchId, 'match-3')
assert.deepEqual(redSuspension.reasons, ['red card'])
assert.equal(availablePlayer.suspended, false)

const servedSuspensions = calculateSuspensions(players, [
  ...baseMatches.slice(0, 2),
  { ...baseMatches[2], status: 'final' },
  {
    id: 'match-4',
    date: '2026-06-23',
    time: '18:00',
    status: 'scheduled',
    homeTeamId: 'team-a',
    awayTeamId: 'team-e',
    events: [],
  },
])

assert.equal(getPlayerSuspension(servedSuspensions, 'p1').suspended, false)
assert.equal(getPlayerSuspension(servedSuspensions, 'p2').suspended, false)

console.log('suspension checks passed')
