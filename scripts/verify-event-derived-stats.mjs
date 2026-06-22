import assert from 'node:assert/strict'
import { liveEventTypes, summarizePlayerEventStats } from '../src/utils/liveMatch.js'
import { getLeaderboards, getTeamEventTotals } from '../src/utils/tournament.js'

const teams = [
  { id: 'team-a', country: 'Team A', code: 'A' },
  { id: 'team-b', country: 'Team B', code: 'B' },
]

const players = [
  { id: 'p1', name: 'Goal Leader', teamId: 'team-a', goals: 99, assists: 99, yellowCards: 99, redCards: 99 },
  { id: 'p2', name: 'Penalty Leader', teamId: 'team-a', goals: 0, assists: 0, yellowCards: 0, redCards: 0 },
  { id: 'p3', name: 'Card Leader', teamId: 'team-b', goals: 0, assists: 0, yellowCards: 0, redCards: 0 },
]

const matches = [
  {
    id: 'match-1',
    events: [
      {
        type: liveEventTypes.goal,
        teamId: 'team-a',
        playerId: 'p1',
        player: 'Goal Leader',
        minute: 4,
      },
      {
        type: liveEventTypes.goal,
        teamId: 'team-b',
        playerId: 'p3',
        player: 'Card Leader',
        minute: 9,
      },
      {
        type: liveEventTypes.goal,
        teamId: 'team-a',
        playerId: 'p1',
        player: 'Goal Leader',
        minute: 11,
      },
      {
        type: liveEventTypes.penaltyGoal,
        teamId: 'team-a',
        playerId: 'p2',
        player: 'Penalty Leader',
        minute: 12,
      },
      {
        type: liveEventTypes.penaltyMiss,
        teamId: 'team-a',
        playerId: 'p2',
        player: 'Penalty Leader',
        minute: 13,
      },
      {
        type: liveEventTypes.yellowCard,
        teamId: 'team-b',
        playerId: 'p3',
        player: 'Card Leader',
        minute: 16,
      },
      {
        type: liveEventTypes.yellowCard,
        teamId: 'team-b',
        playerId: 'p3',
        player: 'Card Leader',
        minute: 18,
      },
      {
        type: liveEventTypes.redCard,
        teamId: 'team-b',
        playerId: 'p3',
        player: 'Card Leader',
        minute: 22,
      },
    ],
  },
]

const summarizedPlayers = summarizePlayerEventStats(players, matches)
const goalLeader = summarizedPlayers.find((player) => player.id === 'p1')
const penaltyLeader = summarizedPlayers.find((player) => player.id === 'p2')
const cardLeader = summarizedPlayers.find((player) => player.id === 'p3')

assert.equal(goalLeader.goals, 2, 'player goals should come from events, not stored player columns')
assert.equal(goalLeader.assists, 0)
assert.equal(penaltyLeader.goals, 1, 'penalty goals should count as goals')
assert.equal(penaltyLeader.assists, 0, 'assists are no longer derived from match events')
assert.equal(cardLeader.yellowCards, 2)
assert.equal(cardLeader.redCards, 1)

const leaderboards = getLeaderboards(summarizedPlayers, teams)
assert.equal(leaderboards.goals[0].id, 'p1')
assert.equal(leaderboards.assists, undefined)
assert.equal(leaderboards.contributions, undefined)
assert.equal(leaderboards.yellowCards[0].id, 'p3')
assert.equal(leaderboards.redCards[0].id, 'p3')

const teamATotals = getTeamEventTotals(summarizedPlayers, 'team-a')
assert.deepEqual(teamATotals, {
  goals: 3,
  redCards: 0,
  yellowCards: 0,
})

const teamBTotals = getTeamEventTotals(summarizedPlayers, 'team-b')
assert.deepEqual(teamBTotals, {
  goals: 1,
  redCards: 1,
  yellowCards: 2,
})

console.log('event-derived stats checks passed')
