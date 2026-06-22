import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.jsx', 'utf8')
const liveMatch = readFileSync('src/utils/liveMatch.js', 'utf8')
const localization = readFileSync('src/utils/localization.js', 'utf8')

function section(startNeedle, endNeedle) {
  const start = app.indexOf(startNeedle)
  assert.notEqual(start, -1, `${startNeedle} should exist`)
  const end = app.indexOf(endNeedle, start + startNeedle.length)
  return app.slice(start, end === -1 ? app.length : end)
}

assert.match(
  liveMatch,
  /export function setLiveMatchMinute\(/,
  'live minute correction should adjust the timestamp-backed clock',
)
assert.match(
  app,
  /setLiveMatchMinute\(/,
  'Admin live controls should persist corrected live minutes',
)

const playerManagement = section('function PlayerManagementPanel(', 'function PlayerEditForm(')
assert.match(playerManagement, /selectedTeamId/, 'Manage Players should track a selected team')
assert.match(playerManagement, /filteredPlayers/, 'Manage Players should filter by team and search')
assert.match(playerManagement, /setSelectedPlayerId\(''\)/, 'changing team should clear the selected player')

const editMatchForm = section('function EditMatchForm(', 'function undoLastEventFromMatch(')
const livePanel = section('function LiveMatchAdminPanel(', 'function LiveAdminTeam(')
assert.match(editMatchForm, /editingEventIndex/, 'admins should be able to edit any existing match event')
assert.match(editMatchForm, /removeEventFromMatch/, 'admins should be able to remove incorrect events')
assert.match(livePanel, /canEditEvents/, 'finished matches should expose event correction controls')

assert.match(app, /function AdminActionNotice\(/, 'admin saves should show explicit success/error feedback')
assert.match(app, /setTeamDraft\(createEmptyTeamDraft\(\)\)/, 'Add Team should reset after success')
assert.match(app, /setNewMatchDraft\(createBlankMatchDraft\(teams\)\)/, 'Add Match should reset to blank after success')

for (const key of [
  'applyMinuteCorrection',
  'correctLiveMinute',
  'finishedMatchEditing',
  'selectPlayer',
  'eventDeletedSuccessfully',
]) {
  const occurrences = localization.match(new RegExp(`${key}:`, 'g')) ?? []
  assert.equal(occurrences.length, 3, `${key} should exist in EN, HE, and AR`)
}

const {
  getLiveClock,
  matchPhases,
  setLiveMatchMinute,
} = await import('../src/utils/liveMatch.js')

const correctedFirstHalf = setLiveMatchMinute({
  status: 'live',
  matchPhase: matchPhases.firstHalf,
  phaseStartedAt: '2026-06-21T16:00:00.000Z',
  firstHalfStartTime: '2026-06-21T16:00:00.000Z',
  phasePausedSeconds: 0,
}, 7, '2026-06-21T16:15:00.000Z')

assert.equal(getLiveClock(correctedFirstHalf, '2026-06-21T16:15:00.000Z').minute, 7)
assert.equal(getLiveClock(correctedFirstHalf, '2026-06-21T16:16:00.000Z').minute, 8)

const correctedSecondHalf = setLiveMatchMinute({
  status: 'live',
  matchPhase: matchPhases.secondHalf,
  phaseStartedAt: '2026-06-21T16:30:00.000Z',
  secondHalfStartTime: '2026-06-21T16:30:00.000Z',
  phasePausedSeconds: 0,
}, 33, '2026-06-21T16:45:00.000Z')

assert.equal(getLiveClock(correctedSecondHalf, '2026-06-21T16:45:00.000Z').minute, 33)

const correctedFinal = setLiveMatchMinute({
  status: 'final',
  matchPhase: matchPhases.final,
  minute: 40,
}, 42, '2026-06-21T17:00:00.000Z')

assert.equal(correctedFinal.minute, 42)

console.log('admin usability checks passed')
