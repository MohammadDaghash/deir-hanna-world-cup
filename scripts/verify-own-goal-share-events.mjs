import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  applyLiveEventToMatch,
  createLiveEvent,
  liveEventTypes,
  normalizeMatchDisciplineEvents,
  summarizePlayerEventStats,
} from '../src/utils/liveMatch.js'

const match = {
  id: 'match-1',
  status: 'live',
  matchPhase: 'first_half',
  homeTeamId: 'team-a',
  awayTeamId: 'team-b',
  homeScore: 0,
  awayScore: 0,
  events: [],
}

const players = [
  { id: 'home-player', name: 'Home Scorer', nameEn: 'Home Scorer', teamId: 'team-a' },
  { id: 'away-player', name: 'Away Defender', nameEn: 'Away Defender', teamId: 'team-b' },
]

assert.equal(liveEventTypes.ownGoal, 'own_goal', 'Own goal must be a first-class live event type')

const normalGoal = createLiveEvent({
  match,
  minute: 12,
  player: players[0],
  teamSide: 'home',
  type: liveEventTypes.goal,
})
const afterNormalGoal = applyLiveEventToMatch(match, normalGoal)
assert.equal(afterNormalGoal.homeScore, 1, 'Normal home-team goal should increase Team 1 score')
assert.equal(afterNormalGoal.awayScore, 0, 'Normal home-team goal should not increase Team 2 score')

const ownGoal = createLiveEvent({
  match,
  minute: 16,
  player: players[1],
  teamSide: 'away',
  type: liveEventTypes.ownGoal,
})
assert.equal(ownGoal.type, liveEventTypes.ownGoal)
assert.equal(ownGoal.playerId, 'away-player', 'Own goal event remains tied to the actual player')
assert.equal(ownGoal.teamId, 'team-a', 'Own goal teamId should be the benefiting opponent team')
assert.equal(ownGoal.assist, '', 'Own goals should not carry an assist')

const afterOwnGoal = applyLiveEventToMatch(match, ownGoal)
assert.equal(afterOwnGoal.homeScore, 1, 'Own goal by Team 2 should increase Team 1 score')
assert.equal(afterOwnGoal.awayScore, 0, 'Own goal by Team 2 should not increase Team 2 score')

const stats = summarizePlayerEventStats(players, [afterOwnGoal])
assert.equal(stats.find((player) => player.id === 'away-player').goals, 0, 'Own goals should not count as player goals')

const secondYellowEvents = normalizeMatchDisciplineEvents([
  { type: liveEventTypes.yellowCard, teamId: 'team-b', playerId: 'away-player', player: 'Away Defender', minute: 10 },
  { type: liveEventTypes.yellowCard, teamId: 'team-b', playerId: 'away-player', player: 'Away Defender', minute: 16 },
])
const automaticRed = secondYellowEvents.find(
  (event) => event.type === liveEventTypes.redCard && event.reason === 'second_yellow',
)
assert.ok(automaticRed, 'Second yellow should create an automatic red-card event')

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
assert.match(app, /function getMatchShareEventGroups\(/, 'Share card should group events by match side')
assert.match(app, /function formatShareEventLine\(/, 'Share card should have a compact event formatter')
assert.match(app, /liveEventTypes\.ownGoal/, 'App UI should handle own-goal events')
assert.match(app, /ui\.ownGoal/, 'Own Goal should use the translation system')
assert.doesNotMatch(app, /<text[^>]*>Goalscorers<\/text>/, 'Share card should not render the old single Goalscorers list')
assert.match(app, /teamId === match\.homeTeamId/, 'Share event ownership should be based on explicit team IDs')

console.log('Own goal and side-based share event checks passed.')
