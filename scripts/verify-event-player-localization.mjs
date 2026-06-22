import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  getEventPlayerName,
} from '../src/utils/localization.js'

const players = [
  {
    id: 'player-1',
    name: 'Mohammad Ragab',
    nameEn: 'Mohammad Ragab',
    nameHe: 'מוחמד רגב',
    nameAr: 'محمد رجب',
  },
]

const eventById = {
  playerId: 'player-1',
  player: 'Mohammad Ragab',
}

const legacyEvent = {
  player: 'Mohammad Ragab',
}

assert.equal(getEventPlayerName(eventById, players, 'en'), 'Mohammad Ragab')
assert.equal(getEventPlayerName(eventById, players, 'he'), 'מוחמד רגב')
assert.equal(getEventPlayerName(eventById, players, 'ar'), 'محمد رجب')
assert.equal(getEventPlayerName(legacyEvent, players, 'ar'), 'محمد رجب')
assert.equal(getEventPlayerName({ player: 'Unknown Player' }, players, 'ar'), 'Unknown Player')

const app = readFileSync('src/App.jsx', 'utf8')

assert.match(
  app,
  /formatShareEventPlayerLabel\(event,\s*players,\s*ui\)/,
  'Story export should resolve event players from the localized player collection',
)
assert.match(
  app,
  /function GoalEventRow\(\{\s*event,\s*players,\s*teams\s*\}\)/,
  'match and admin timelines should receive players for localized event names',
)
assert.doesNotMatch(
  app,
  /\{event\.player\}/,
  'public event displays should not render the stored legacy player string directly',
)

console.log('Event player localization checks passed.')
