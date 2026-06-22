import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.jsx', 'utf8')
const css = readFileSync('src/App.css', 'utf8')

function functionBody(name) {
  const start = app.indexOf(`function ${name}(`)
  assert.notEqual(start, -1, `${name} should exist`)

  const next = app.indexOf('\nfunction ', start + 1)
  return app.slice(start, next === -1 ? app.length : next)
}

const knockoutPanel = functionBody('KnockoutPanel')
const mobilePath = functionBody('MobileKnockoutPath')
const mobileStage = functionBody('MobileBracketStage')
const mobileNode = functionBody('MobileBracketNode')
const mobileMatch = functionBody('MobileBracketMatch')
const mobileTeam = functionBody('MobileBracketTeam')
const knockoutBoard = functionBody('KnockoutBoard')

assert.match(knockoutPanel, /desktop-knockout-path/, 'desktop bracket should be explicitly isolated from mobile layout')
assert.match(knockoutPanel, /mobile-knockout-path/, 'mobile knockout path should have its own layout wrapper')
assert.match(knockoutPanel, /lg:block/, 'desktop bracket should remain available on desktop')
assert.match(knockoutPanel, /lg:hidden/, 'mobile bracket viewer should only render on smaller screens')

assert.match(mobilePath, /mobile-knockout-viewer/, 'mobile path should render a dark bracket viewer shell')
assert.match(mobilePath, /ui\.bracketViewer/, 'mobile path should include Bracket Viewer header text')
assert.match(mobilePath, /ui\.knockoutPath/, 'mobile path should include Knockout Path header text')
assert.match(mobilePath, /handleMobileBracketBack/, 'mobile path should provide a close/back control')
assert.match(mobilePath, /ui\.semiFinals/, 'mobile path should include semi-finals stage')
assert.match(mobilePath, /ui\.thirdPlace/, 'mobile path should include third-place stage')
assert.match(mobilePath, /ui\.final/, 'mobile path should include final stage')
assert.match(mobilePath, /homeLabel: 'A1'[\s\S]*awayLabel: 'B2'/, 'mobile path should show Semi-final 1 placeholders')
assert.match(mobilePath, /homeLabel: 'B1'[\s\S]*awayLabel: 'A2'/, 'mobile path should show Semi-final 2 placeholders')
assert.match(mobilePath, /homeLabel: 'WS1'[\s\S]*awayLabel: 'WS2'/, 'mobile path should show final placeholders')
assert.match(mobilePath, /homeLabel: 'LS1'[\s\S]*awayLabel: 'LS2'/, 'mobile path should show third-place placeholders')
assert.match(mobilePath, /mobile-bracket-line/, 'mobile path should render connector lines between semi-finals and final')
assert.doesNotMatch(mobilePath, /bg-white p-3/, 'mobile bracket viewer should avoid generic white stacked cards')

assert.match(mobileStage, /mobile-bracket-flow/, 'mobile stage should use an intentional bracket flow')
assert.match(mobileMatch, /getStageLabel\(match\.stage, ui\)/, 'each mobile match card should show a translated stage label')
assert.match(mobileMatch, /formatDate\(match\.date\).*match\.time/s, 'each mobile match card should show date and time')
assert.match(mobileMatch, /StatusPill/, 'each mobile match card should show match status')
assert.match(mobileMatch, /homeScore/, 'mobile match card should preserve team-score ownership')
assert.match(mobileMatch, /awayScore/, 'mobile match card should preserve team-score ownership')
assert.match(mobileNode, /MobileBracketMatch/, 'mobile bracket nodes should reuse the match card renderer')
assert.match(mobileNode, /slot\.homeLabel/, 'mobile bracket nodes should preserve placeholder labels')
assert.match(mobileTeam, /score/, 'team rows should receive the correct side score')
assert.match(mobileTeam, /fallbackLabel/, 'team rows should support placeholders when real teams are not assigned')

assert.match(knockoutBoard, /mobile-knockout-board-path/, 'knockout page should expose mobile knockout path outside the desktop-only wrapper')
assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.desktop-knockout-path/, 'mobile CSS should explicitly suppress desktop bracket overflow')
assert.match(css, /mobile-knockout-path[\s\S]*overflow-x:\s*hidden/, 'mobile knockout path should prevent horizontal overflow')
assert.match(css, /\.mobile-knockout-viewer[\s\S]*background:/, 'mobile knockout viewer should use a dark sports background')
assert.match(css, /\.mobile-bracket-scroll[\s\S]*overflow-x:\s*auto/, 'mobile bracket should use intentional horizontal scroll')
assert.match(css, /\.mobile-bracket-node[\s\S]*background:/, 'mobile match nodes should be compact dark cards')
assert.match(css, /\.mobile-bracket-line/, 'mobile connector lines should be styled in CSS')
assert.match(css, /bracket-match-node::before[\s\S]*display:\s*none/, 'connector pseudo-elements should be disabled on mobile')

console.log('mobile knockout layout checks passed')
