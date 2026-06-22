import assert from 'node:assert/strict'
import {
  applyLiveEventToMatch,
  calculateLiveMinute,
  createLiveEvent,
  endFirstHalf,
  endLiveMatch,
  getLiveClock,
  matchPhases,
  pauseLiveMatch,
  resumeLiveMatch,
  startSecondHalf,
  startLiveMatch,
  summarizePlayerEventStats,
} from '../src/utils/liveMatch.js'

const kickoff = '2026-06-20T19:30:00.000Z'
const now = '2026-06-20T19:52:30.000Z'

assert.equal(calculateLiveMinute({ status: 'live', matchStartTime: kickoff }, now), 23)
assert.equal(calculateLiveMinute({ status: 'live', matchStartTime: null, minute: 7 }, now), 7)

const scheduledMatch = {
  id: 'match-1',
  status: 'scheduled',
  homeScore: undefined,
  awayScore: '',
  homeTeamId: 'team-1',
  awayTeamId: 'team-2',
  events: [],
}
const liveMatch = startLiveMatch(scheduledMatch, kickoff)

assert.equal(liveMatch.status, 'live')
assert.equal(liveMatch.matchPhase, matchPhases.firstHalf)
assert.equal(liveMatch.homeScore, 0)
assert.equal(liveMatch.awayScore, 0)
assert.equal(liveMatch.matchStartTime, kickoff)
assert.equal(liveMatch.firstHalfStartTime, kickoff)
assert.equal(liveMatch.matchEndTime, undefined)

assert.deepEqual(getLiveClock(liveMatch, '2026-06-20T19:49:30.000Z'), {
  displayMinute: "20'",
  minute: 20,
  phase: matchPhases.firstHalf,
})
assert.deepEqual(getLiveClock(liveMatch, '2026-06-20T19:51:30.000Z'), {
  displayMinute: "20+2'",
  minute: 22,
  phase: matchPhases.firstHalf,
})
assert.deepEqual(getLiveClock(liveMatch, '2026-06-20T19:58:30.000Z'), {
  displayMinute: "20+5'",
  minute: 25,
  phase: matchPhases.firstHalf,
})

const goalEvent = createLiveEvent({
  match: liveMatch,
  type: 'goal',
  teamSide: 'home',
  player: { id: 'p-1', name: 'Scorer' },
  now,
})

assert.deepEqual(goalEvent, {
  eventPhase: matchPhases.firstHalf,
  minute: 23,
  displayMinute: "20+3'",
  type: 'goal',
  teamId: 'team-1',
  playerId: 'p-1',
  player: 'Scorer',
  assistPlayerId: undefined,
  assist: '',
})

const manualMinuteEvent = createLiveEvent({
  match: liveMatch,
  minute: 19,
  type: 'yellow_card',
  teamSide: 'home',
  player: { id: 'p-1', name: 'Scorer' },
  now,
})
assert.equal(manualMinuteEvent.minute, 19)
assert.equal(manualMinuteEvent.displayMinute, "19'")

const afterGoal = applyLiveEventToMatch(liveMatch, goalEvent)
assert.equal(afterGoal.homeScore, 1)
assert.equal(afterGoal.awayScore, 0)
assert.equal(afterGoal.events.length, 1)

const redCardEvent = createLiveEvent({
  match: afterGoal,
  type: 'red_card',
  teamSide: 'away',
  player: { id: 'p-3', name: 'Defender' },
  now,
})
const afterRedCard = applyLiveEventToMatch(afterGoal, redCardEvent)
assert.equal(afterRedCard.homeScore, 1)
assert.equal(afterRedCard.awayScore, 0)
assert.equal(afterRedCard.events.length, 2)

const penaltyGoalEvent = createLiveEvent({
  match: afterRedCard,
  type: 'penalty',
  penaltyOutcome: 'goal',
  teamSide: 'away',
  player: { id: 'p-2', name: 'Penalty Taker' },
  now,
})
assert.equal(penaltyGoalEvent.type, 'penalty_goal')
const afterPenaltyGoal = applyLiveEventToMatch(afterRedCard, penaltyGoalEvent)
assert.equal(afterPenaltyGoal.homeScore, 1)
assert.equal(afterPenaltyGoal.awayScore, 1)

const penaltyMissEvent = createLiveEvent({
  match: afterPenaltyGoal,
  type: 'penalty',
  penaltyOutcome: 'miss',
  teamSide: 'away',
  player: { id: 'p-2', name: 'Penalty Taker' },
  now,
})
assert.equal(penaltyMissEvent.type, 'penalty_miss')
const afterPenaltyMiss = applyLiveEventToMatch(afterPenaltyGoal, penaltyMissEvent)
assert.equal(afterPenaltyMiss.homeScore, 1)
assert.equal(afterPenaltyMiss.awayScore, 1)

const pausedMatch = pauseLiveMatch(afterRedCard, '2026-06-20T19:40:00.000Z')
assert.equal(pausedMatch.matchPhase, matchPhases.paused)
assert.equal(pausedMatch.previousPhase, matchPhases.firstHalf)
assert.equal(pausedMatch.pauseStartedAt, '2026-06-20T19:40:00.000Z')
assert.equal(getLiveClock(pausedMatch, '2026-06-20T19:44:00.000Z').displayMinute, "11'")

const resumedMatch = resumeLiveMatch(pausedMatch, '2026-06-20T19:42:00.000Z')
assert.equal(resumedMatch.matchPhase, matchPhases.firstHalf)
assert.equal(resumedMatch.phasePausedSeconds, 120)
assert.equal(resumedMatch.pauseStartedAt, undefined)

const halftimeMatch = endFirstHalf(resumedMatch, '2026-06-20T19:55:00.000Z')
assert.equal(halftimeMatch.matchPhase, matchPhases.halftime)
assert.equal(halftimeMatch.firstHalfEndTime, '2026-06-20T19:55:00.000Z')
assert.equal(getLiveClock(halftimeMatch, '2026-06-20T20:00:00.000Z').displayMinute, 'HT')

const secondHalfMatch = startSecondHalf(halftimeMatch, '2026-06-20T20:05:00.000Z')
assert.equal(secondHalfMatch.matchPhase, matchPhases.secondHalf)
assert.equal(secondHalfMatch.secondHalfStartTime, '2026-06-20T20:05:00.000Z')
assert.deepEqual(getLiveClock(secondHalfMatch, '2026-06-20T20:24:30.000Z'), {
  displayMinute: "40'",
  minute: 40,
  phase: matchPhases.secondHalf,
})
assert.deepEqual(getLiveClock(secondHalfMatch, '2026-06-20T20:26:30.000Z'), {
  displayMinute: "40+2'",
  minute: 42,
  phase: matchPhases.secondHalf,
})

const players = [
  { id: 'p-1', name: 'Scorer', goals: 0, assists: 0, yellowCards: 0, redCards: 0 },
  { id: 'p-2', name: 'Assistant', goals: 0, assists: 0, yellowCards: 0, redCards: 0 },
  { id: 'p-3', name: 'Defender', goals: 0, assists: 0, yellowCards: 0, redCards: 0 },
]
const playerStats = summarizePlayerEventStats(players, [afterPenaltyMiss])

assert.equal(playerStats.find((player) => player.id === 'p-1').goals, 1)
assert.equal(playerStats.find((player) => player.id === 'p-2').assists, 0)
assert.equal(playerStats.find((player) => player.id === 'p-2').goals, 1)
assert.equal(playerStats.find((player) => player.id === 'p-3').redCards, 1)

const finalMatch = endLiveMatch(secondHalfMatch, '2026-06-20T20:25:00.000Z')
assert.equal(finalMatch.status, 'final')
assert.equal(finalMatch.matchPhase, matchPhases.final)
assert.equal(finalMatch.matchEndTime, '2026-06-20T20:25:00.000Z')
assert.equal(finalMatch.secondHalfEndTime, '2026-06-20T20:25:00.000Z')
assert.equal(finalMatch.homeScore, 1)
assert.equal(finalMatch.awayScore, 0)

console.log('live match workflow checks passed')
