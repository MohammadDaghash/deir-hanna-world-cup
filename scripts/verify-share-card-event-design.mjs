import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.jsx', 'utf8')

function functionBody(name) {
  const start = app.indexOf(`function ${name}(`)
  assert.notEqual(start, -1, `${name} should exist`)

  const next = app.indexOf('\nfunction ', start + 1)
  return app.slice(start, next === -1 ? app.length : next)
}

const eventRows = functionBody('buildShareEventRows')
const eventColumn = functionBody('buildShareEventColumn')
const footballIcon = functionBody('buildShareFootballIcon')

assert.match(eventRows, /scoreRowsByPlayer/, 'share-card goals should be grouped by player')
assert.match(eventRows, /minutes\.push/, 'grouped goal rows should collect all scoring minutes')
assert.match(eventRows, /icons\.push/, 'grouped goal rows should keep one football icon per goal')
assert.match(eventRows, /kind: 'card'/, 'yellow/red cards should be separate card rows')
assert.match(eventRows, /kind: 'score'/, 'goals should be score rows')
assert.match(eventRows, /liveEventTypes\.yellowCard[\s\S]*kind: 'card'/, 'yellow cards should never be merged into goal rows')
assert.match(eventRows, /liveEventTypes\.redCard[\s\S]*kind: 'card'/, 'red cards should never be merged into goal rows')

assert.match(footballIcon, /<circle/, 'football icon should be SVG, not an emoji text marker')
assert.match(footballIcon, /<path/, 'football icon should include clean ball panel paths')
assert.doesNotMatch(footballIcon, /⚽/, 'football icon must not use emoji')

assert.match(eventColumn, /buildShareEventRows/, 'event column should render normalized grouped rows')
assert.match(eventColumn, /row\.kind === 'score'/, 'event column should branch score rows separately')
assert.match(eventColumn, /row\.kind === 'card'/, 'event column should branch card rows separately')
assert.match(eventColumn, /row\.icons\.map/, 'event column should render one football icon per grouped goal')
assert.match(eventColumn, /row\.minutes\.join/, 'event column should show all scoring minutes on one row')
assert.match(eventColumn, /iconColumnWidth/, 'event rows should reserve an icon column')
assert.match(eventColumn, /minuteColumnWidth/, 'event rows should reserve a minute column')
assert.match(eventColumn, /nameColumnWidth/, 'event rows should reserve a player-name column')
assert.match(eventColumn, /nameFontSize/, 'long player names should be allowed to shrink safely')
assert.doesNotMatch(eventColumn, /playerRegionStart/, 'event rows should not use collision-prone dynamic player regions')
assert.doesNotMatch(eventColumn, /playerRegionEnd/, 'event rows should not use collision-prone dynamic player regions')
assert.doesNotMatch(eventColumn, /marker: getShareEventMarker/, 'story export should not use old per-event emoji marker rows')
assert.doesNotMatch(functionBody('getShareEventMarker'), /⚽/, 'share story markers should not contain the old goal emoji')

console.log('share-card event design checks passed')
