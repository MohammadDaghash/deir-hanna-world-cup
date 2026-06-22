import assert from 'node:assert/strict'

import {
  applyLiveEventToMatch,
  createLiveEvent,
  isPlayerSentOffInMatch,
  liveEventTypes,
  normalizeMatchDisciplineEvents,
  summarizePlayerEventStats,
} from '../src/utils/liveMatch.js'
import { calculateSuspensions, getPlayerSuspension } from '../src/utils/tournament.js'

const player = { id: 'p1', name: 'Card Player', teamId: 'team-a' }
const teammate = { id: 'p2', name: 'Teammate', teamId: 'team-a' }
const players = [player, teammate]
const liveMatch = {
  id: 'match-1',
  date: '2026-06-20',
  time: '18:00',
  status: 'live',
  matchPhase: 'first_half',
  homeTeamId: 'team-a',
  awayTeamId: 'team-b',
  homeScore: 0,
  awayScore: 0,
  minute: 1,
  events: [],
}
const nextMatch = {
  id: 'match-2',
  date: '2026-06-21',
  time: '18:00',
  status: 'scheduled',
  homeTeamId: 'team-a',
  awayTeamId: 'team-c',
  events: [],
}

const firstYellow = createLiveEvent({
  match: liveMatch,
  minute: 10,
  player,
  teamSide: 'home',
  type: liveEventTypes.yellowCard,
})
const afterOneYellow = applyLiveEventToMatch(liveMatch, firstYellow)

assert.equal(afterOneYellow.events.length, 1, 'one yellow should create one event')
assert.equal(afterOneYellow.events[0].type, liveEventTypes.yellowCard)
assert.equal(isPlayerSentOffInMatch(afterOneYellow, player.id), false, 'one yellow should not send off player')

const secondYellow = createLiveEvent({
  match: afterOneYellow,
  minute: 28,
  player,
  teamSide: 'home',
  type: liveEventTypes.yellowCard,
})
const afterSecondYellow = applyLiveEventToMatch(afterOneYellow, secondYellow)
const autoRed = afterSecondYellow.events.find((event) => event.type === liveEventTypes.redCard)

assert.equal(afterSecondYellow.events.filter((event) => event.type === liveEventTypes.yellowCard).length, 2)
assert.ok(autoRed, 'second yellow should automatically create red-card dismissal event')
assert.equal(autoRed.automatic, true)
assert.equal(autoRed.reason, 'second_yellow')
assert.equal(autoRed.playerId, player.id)
assert.equal(isPlayerSentOffInMatch(afterSecondYellow, player.id), true, 'player should be sent off after second yellow')

const secondYellowStats = summarizePlayerEventStats(players, [afterSecondYellow]).find((item) => item.id === player.id)
assert.equal(secondYellowStats.yellowCards, 2)
assert.equal(secondYellowStats.redCards, 1, 'automatic second-yellow red should count as one red card')

assert.throws(
  () => createLiveEvent({
    match: afterSecondYellow,
    minute: 30,
    player,
    teamSide: 'home',
    type: liveEventTypes.yellowCard,
  }),
  /player_sent_off/,
  'admin should be prevented from adding events for a sent-off player',
)

const afterYellowRemoved = {
  ...afterSecondYellow,
  events: normalizeMatchDisciplineEvents(afterSecondYellow.events.filter((event) => event !== secondYellow)),
}

assert.equal(afterYellowRemoved.events.filter((event) => event.type === liveEventTypes.yellowCard).length, 1)
assert.equal(
  afterYellowRemoved.events.some((event) => event.type === liveEventTypes.redCard && event.automatic),
  false,
  'removing a yellow should remove the automatic red after recalculation',
)
assert.equal(isPlayerSentOffInMatch(afterYellowRemoved, player.id), false)

const directRed = applyLiveEventToMatch(liveMatch, createLiveEvent({
  match: liveMatch,
  minute: 12,
  player,
  teamSide: 'home',
  type: liveEventTypes.redCard,
}))
assert.equal(isPlayerSentOffInMatch(directRed, player.id), true, 'direct red should send off player')
assert.equal(
  getPlayerSuspension(calculateSuspensions(players, [{ ...directRed, status: 'final' }, nextMatch]), player.id).matchId,
  'match-2',
  'direct red should suspend next match',
)

const crossMatchYellowSuspension = calculateSuspensions(players, [
  {
    ...liveMatch,
    id: 'group-1',
    status: 'final',
    date: '2026-06-18',
    events: [firstYellow],
  },
  {
    ...liveMatch,
    id: 'group-2',
    status: 'final',
    date: '2026-06-19',
    events: [{
      ...firstYellow,
      minute: 21,
    }],
  },
  nextMatch,
])
assert.equal(getPlayerSuspension(crossMatchYellowSuspension, player.id).matchId, 'match-2')

const teammateEvent = createLiveEvent({
  match: afterSecondYellow,
  minute: 31,
  player: teammate,
  teamSide: 'home',
  type: liveEventTypes.yellowCard,
})
assert.equal(teammateEvent.playerId, teammate.id, 'sent-off protection should not block other players')

console.log('card rule checks passed')
