import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.jsx', 'utf8')

function componentBody(name) {
  const start = app.indexOf(`function ${name}(`)
  assert.notEqual(start, -1, `${name} should exist`)

  const next = app.indexOf('\nfunction ', start + 1)
  return app.slice(start, next === -1 ? app.length : next)
}

function assertHasLtrScoreStructure(name) {
  const body = componentBody(name)
  assert.match(body, /dir="ltr"/, `${name} should isolate score/team structure from inherited RTL`)
}

assert.match(app, /<main[^>]+dir=\{languageDirection\}/, 'app root should still set language direction')
assert.match(app, /function MatchScoreText\(\{ match/, 'shared MatchScoreText component should exist')
assert.match(app, /function MatchScoreRows\(\{/, 'mobile-safe MatchScoreRows component should exist')
assert.match(
  componentBody('MatchScoreText'),
  /dir="ltr"/,
  'match score text should always render left-to-right as Team 1 score - Team 2 score',
)
assert.match(
  componentBody('MatchScoreRows'),
  /homeScore:[\s\S]*match\.homeScore[\s\S]*awayScore:[\s\S]*match\.awayScore/,
  'mobile score rows should explicitly bind each score to its team',
)

;[
  'OverviewMatchScoreRows',
  'LiveMatch',
  'LiveNowFloatingBadge',
  'MatchRow',
  'MatchCenterPage',
  'AdminQuickModeScreen',
  'LiveMatchAdminPanel',
].forEach(assertHasLtrScoreStructure)

assert.match(componentBody('ScoreCell'), /<MatchScoreText match=\{match\} \/>/)
assert.match(componentBody('LiveMatch'), /<MatchScoreText match=\{match\} \/>/)
assert.match(componentBody('MatchCenterPage'), /<MatchScoreText match=\{match\} \/>/)
assert.match(componentBody('LiveNowFloatingBadge'), /<MatchScoreRows match=\{primaryMatch\} home=\{primaryHome\} away=\{primaryAway\}/)

console.log('rtl score order checks passed')
