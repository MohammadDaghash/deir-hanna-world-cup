import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.jsx', 'utf8')

function section(startNeedle, endNeedle) {
  const start = app.indexOf(startNeedle)
  assert.notEqual(start, -1, `${startNeedle} should exist`)
  const end = endNeedle ? app.indexOf(endNeedle, start + startNeedle.length) : -1
  return app.slice(start, end === -1 ? app.length : end)
}

const adminBoard = section('function AdminBoard(', 'function QrPosterPanel(')
const livePanel = section('function AdminLiveMatchControl(', 'function AdminAccordionSection(')

assert.match(app, /function AdminLiveMatchControl\(/, 'Admin should have a focused live-match control component')
assert.match(app, /function AdminAccordionSection\(/, 'Admin tools should be hidden behind accordion sections')
assert.match(adminBoard, /<AdminLiveMatchControl/, 'Live Match Control should render in AdminBoard')
assert.match(adminBoard, /<AdminAccordionSection[\s\S]*title=\{ui\.matchSetup\}/, 'Match Setup should be collapsed behind an accordion')
assert.match(adminBoard, /<AdminAccordionSection[\s\S]*title=\{ui\.teamsAndPlayers\}/, 'Teams & Players should be collapsed behind an accordion')
assert.match(adminBoard, /<AdminAccordionSection[\s\S]*title=\{ui\.sharing\}/, 'Sharing should be collapsed behind an accordion')
assert.match(adminBoard, /<AdminAccordionSection[\s\S]*title=\{ui\.adminSettings\}/, 'Admin Settings should be collapsed behind an accordion')
assert.ok(
  adminBoard.indexOf('<AdminLiveMatchControl') < adminBoard.indexOf('<AdminAccordionSection'),
  'Live Match Control should appear before all secondary admin sections',
)
assert.match(livePanel, /ui\.startMatch/, 'Live panel should expose Start Match')
assert.match(livePanel, /ui\.quickMode/, 'Live panel should expose Quick Mode')
assert.match(livePanel, /ui\.save/, 'Live panel should expose Save')
assert.match(livePanel, /ui\.status/, 'Live panel should show status control')
assert.match(livePanel, /ui\.team1[\s\S]*ui\.score/, 'Live panel should show Team 1 score control')
assert.match(livePanel, /ui\.team2[\s\S]*ui\.score/, 'Live panel should show Team 2 score control')

console.log('admin live redesign checks passed')
