import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.jsx', 'utf8')

assert.match(app, /function getTodayMatches/)
assert.match(app, /function TodaySection/)
assert.match(app, /function TodayMatchCard/)
assert.match(app, /No matches today\./)
assert.match(app, /a\.status === 'live'[\s\S]*return -1/)
assert.match(app, /b\.status === 'live'[\s\S]*return 1/)
assert.match(app, /formatLocalDateKey\(new Date\(\)\)/)

const overviewStart = app.indexOf('function Overview(')
const overviewEnd = app.indexOf('function ViewerFocus(')
assert.notEqual(overviewStart, -1, 'Overview component should exist')
assert.notEqual(overviewEnd, -1, 'ViewerFocus component should follow Overview')
const overviewBody = app.slice(overviewStart, overviewEnd)

assert.match(overviewBody, /const todayMatches = getTodayMatches\(allMatches\)/)
assert.match(overviewBody, /<TodaySection/)
assert.match(overviewBody, /matches=\{todayMatches\}/)
assert.match(overviewBody, /onMatchSelect=\{onMatchSelect\}/)

const todaySectionIndex = overviewBody.indexOf('<TodaySection')
const viewerFocusIndex = overviewBody.indexOf('<ViewerFocus')
assert.ok(todaySectionIndex > -1 && viewerFocusIndex > -1 && todaySectionIndex < viewerFocusIndex, 'TodaySection should appear near the top before ViewerFocus')

console.log('today-section checks passed')
