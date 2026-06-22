import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  applyLiveEventToMatch,
  createLiveEvent,
  buildMatchEventRowsForSave,
  liveEventTypes,
  normalizeMatchDisciplineEvents,
  normalizePersistedEventType,
} from '../src/utils/liveMatch.js'

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const editMatchFormSource = app.slice(
  app.indexOf('function EditMatchForm'),
  app.indexOf('function removeEventFromMatch'),
)

const match = {
  id: 'match-card-save',
  status: 'final',
  matchPhase: 'final',
  homeTeamId: 'team-a',
  awayTeamId: 'team-b',
  homeScore: 3,
  awayScore: 1,
  minute: 40,
  events: [],
}
const player = {
  id: 'player-a',
  name: 'English Name',
  nameEn: 'English Name',
  nameHe: 'שם עברי',
  nameAr: 'اسم عربي',
  teamId: 'team-a',
}
const awayPlayer = {
  id: 'player-b',
  name: 'Away Player',
  teamId: 'team-b',
}

const yellowCard = createLiveEvent({
  match,
  minute: 23,
  player,
  teamSide: 'home',
  type: liveEventTypes.yellowCard,
})
const afterYellow = applyLiveEventToMatch(match, yellowCard)

assert.equal(afterYellow.homeScore, 3, 'yellow card must not change Team 1 score')
assert.equal(afterYellow.awayScore, 1, 'yellow card must not change Team 2 score')
assert.equal(afterYellow.events.at(-1).type, liveEventTypes.yellowCard)
assert.equal(afterYellow.events.at(-1).teamId, 'team-a')
assert.equal(afterYellow.events.at(-1).playerId, 'player-a')
assert.equal(afterYellow.events.at(-1).minute, 23)

const redCard = createLiveEvent({
  match: afterYellow,
  minute: 34,
  player: awayPlayer,
  teamSide: 'away',
  type: liveEventTypes.redCard,
})
const afterRed = applyLiveEventToMatch(afterYellow, redCard)

assert.equal(afterRed.homeScore, 3, 'red card must not change Team 1 score')
assert.equal(afterRed.awayScore, 1, 'red card must not change Team 2 score')

const cardRows = buildMatchEventRowsForSave(afterRed.id, afterRed.events)
assert.equal(cardRows.length, 2, 'yellow and red card rows should both be persisted')
assert.deepEqual(
  cardRows.map((row) => row.event_type),
  [liveEventTypes.yellowCard, liveEventTypes.redCard],
  'saved event_type values should preserve card types',
)
assert.deepEqual(
  cardRows.map((row) => row.type),
  [liveEventTypes.yellowCard, liveEventTypes.redCard],
  'saved legacy type values should preserve card types',
)
assert.equal(cardRows[0].team_id, 'team-a')
assert.equal(cardRows[0].player_id, 'player-a')
assert.equal(cardRows[0].minute, 23)
assert.equal(cardRows[1].team_id, 'team-b')
assert.equal(cardRows[1].player_id, 'player-b')
assert.equal(cardRows[1].minute, 34)

const secondYellow = createLiveEvent({
  match: afterYellow,
  minute: 38,
  player,
  teamSide: 'home',
  type: liveEventTypes.yellowCard,
})
const afterSecondYellow = applyLiveEventToMatch(afterYellow, secondYellow)
const normalizedSecondYellowEvents = normalizeMatchDisciplineEvents(afterSecondYellow.events)

assert.ok(
  normalizedSecondYellowEvents.some((event) => event.type === liveEventTypes.redCard && event.reason === 'second_yellow'),
  'second yellow should still create an automatic red event in memory',
)

const secondYellowRows = buildMatchEventRowsForSave(afterSecondYellow.id, afterSecondYellow.events)
assert.equal(
  secondYellowRows.filter((row) => row.event_type === liveEventTypes.yellowCard).length,
  2,
  'both yellow card rows should be saved so reload can recreate second-yellow red logic',
)

assert.equal(
  normalizePersistedEventType({ type: liveEventTypes.yellowCard, event_type: liveEventTypes.goal }),
  liveEventTypes.yellowCard,
  'legacy/migrated yellow-card rows with default event_type=goal should reload as yellow cards',
)
assert.equal(
  normalizePersistedEventType({ type: liveEventTypes.redCard, event_type: liveEventTypes.goal }),
  liveEventTypes.redCard,
  'legacy/migrated red-card rows with default event_type=goal should reload as red cards',
)
assert.equal(
  normalizePersistedEventType({ type: liveEventTypes.goal, event_type: liveEventTypes.yellowCard }),
  liveEventTypes.yellowCard,
  'event_type should be honored when legacy type is the default goal',
)
assert.equal(
  secondYellowRows.some((row) => row.event_type === liveEventTypes.redCard),
  false,
  'automatic second-yellow red should not be duplicated as a manual DB row',
)
assert.ok(
  normalizeMatchDisciplineEvents(secondYellowRows.map((row) => ({
    minute: row.minute,
    eventPhase: row.event_phase,
    displayMinute: row.display_minute,
    type: row.event_type,
    teamId: row.team_id,
    playerId: row.player_id,
    player: row.player,
  }))).some((event) => event.type === liveEventTypes.redCard && event.reason === 'second_yellow'),
  'reloaded yellow rows should recreate the automatic red event',
)

assert.match(
  app,
  /const saved = await saveDraft\(nextDraft\)[\s\S]*if \(saved === false\) \{[\s\S]*return[\s\S]*\}[\s\S]*setEventAction\(null\)/,
  'finished-match correction modal should close only after successful save',
)
assert.match(
  app,
  /const saved = await handleQuickModeSaveMatch\(nextDraft\)[\s\S]*if \(saved === false\) \{[\s\S]*return[\s\S]*\}[\s\S]*setEventAction\(null\)/,
  'Quick Mode event flow should close only after successful save',
)
assert.match(app, /quickEventNotice/, 'Quick Mode should show card event save success or error feedback')
assert.match(app, /eventSaveFailed/, 'Card event save failures should use localized feedback')
assert.match(app, /automatic: event\.automatic \?\? false/, 'match drafts should preserve automatic second-yellow metadata')
assert.match(app, /reason: event\.reason \?\? ''/, 'match drafts should preserve second-yellow reason metadata')
assert.match(app, /automatic: Boolean\(event\.automatic\)/, 'normalized match saves should preserve automatic event metadata')
assert.match(app, /reason: event\.reason \|\| undefined/, 'normalized match saves should preserve event reason metadata')
assert.ok(
  editMatchFormSource.indexOf('<LiveEventModal') > editMatchFormSource.indexOf('</form>'),
  'live event modal must render outside the Edit Match form so card submits are not swallowed by the parent form',
)

console.log('card event saving checks passed')
