import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.jsx', 'utf8')

assert.match(app, /const publicNavItems = navItems/)
assert.match(app, /function SpectatorQuickLinks/)
assert.match(app, /function MatchDayPanel/)
assert.match(app, /function TopScorersPreview/)
assert.match(app, /getSpectatorMatchDay/)

const overviewStart = app.indexOf('function Overview(')
const overviewEnd = app.indexOf('function ViewerFocus(')
assert.notEqual(overviewStart, -1, 'Overview component should exist')
assert.notEqual(overviewEnd, -1, 'ViewerFocus component should exist after Overview')
const overviewBody = app.slice(overviewStart, overviewEnd)

assert.match(overviewBody, /<SpectatorQuickLinks/)
assert.match(overviewBody, /<MatchDayPanel/)
assert.match(overviewBody, /<GroupSnapshot/)
assert.match(overviewBody, /<TopScorersPreview/)
assert.match(overviewBody, /<KnockoutPanel/)
assert.equal(overviewBody.includes('<StatsGrid'), false, 'Overview should not show broad stat cards')
assert.equal(overviewBody.includes('<InsightsPanel'), false, 'Overview should not show dense insight cards')
assert.equal(overviewBody.includes('<MatchTimeline'), false, 'Overview should not show empty timeline card')

const matchRowStart = app.indexOf('function MatchRow(')
const matchRowEnd = app.indexOf('function getVoteBreakdown(')
assert.notEqual(matchRowStart, -1, 'MatchRow component should exist')
assert.notEqual(matchRowEnd, -1, 'getVoteBreakdown should follow MatchRow')
const matchRowBody = app.slice(matchRowStart, matchRowEnd)

assert.equal(matchRowBody.includes('<PredictionVote'), false, 'Match rows should not expand into full voting cards')
assert.match(app, /<PredictionVote\s+match=\{match\}/, 'match-specific voting should remain on details/focus views')

console.log('spectator-ux checks passed')
