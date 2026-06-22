import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.jsx', 'utf8')
const css = readFileSync('src/App.css', 'utf8')
const localization = readFileSync('src/utils/localization.js', 'utf8')

function section(startMarker, endMarker) {
  const start = app.indexOf(startMarker)
  assert.notEqual(start, -1, `${startMarker} should exist`)
  const end = app.indexOf(endMarker, start + startMarker.length)
  assert.notEqual(end, -1, `${endMarker} should exist after ${startMarker}`)
  return app.slice(start, end)
}

assert.match(app, /const israelTimeZone = 'Asia\/Jerusalem'/)
assert.match(app, /function getIsraelMatchKickoffTimestamp/)
assert.match(app, /Intl\.DateTimeFormat\('en-US'[\s\S]*timeZone: israelTimeZone/)
assert.match(app, /function getMatchCountdown/)
assert.match(app, /function formatCountdownDuration/)
assert.match(app, /function MatchCountdown/)
assert.match(app, /setInterval\(\(\) => setLiveClockNow\(new Date\(\)\), 1000\)/)

const tournamentHeaderStart = app.indexOf('function TournamentHeader(')
const tournamentHeaderEnd = app.indexOf('function StatsStrip(')
assert.ok(app.slice(tournamentHeaderStart, tournamentHeaderEnd).includes('<MatchCountdown'))

const overview = section('function Overview(', 'function OverviewMatchCenter(')
assert.ok(overview.includes('now={now}'))

const overviewMatchCenterCard = section('function OverviewMatchCenterCard(', 'function OverviewMatchEvents(')
assert.ok(overviewMatchCenterCard.includes('<MatchCountdown'))

const matchRow = section('function MatchRow(', 'function getVoteBreakdown(')
assert.ok(matchRow.includes('<MatchCountdown'))

const matchCenter = section('function MatchCenterPage(', 'function MatchShareCardPanel(')
assert.ok(matchCenter.includes('<MatchCountdown'))

assert.match(css, /\.match-countdown/)
assert.match(css, /\.match-countdown-time/)

for (const key of ['startsIn']) {
  assert.match(localization, new RegExp(`${key}:`))
}

console.log('match countdown checks passed')
