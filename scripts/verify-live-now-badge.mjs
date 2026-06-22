import assert from 'node:assert/strict'
import fs from 'node:fs'

const app = fs.readFileSync('src/App.jsx', 'utf8')

assert.match(app, /const liveMatches = useMemo\(/, 'App should derive live matches')
assert.match(app, /match\.status === 'live'/, 'Live matches should be detected by status')
assert.match(app, /function LiveNowFloatingBadge\(/, 'LiveNowFloatingBadge component should exist')
assert.match(app, /ui\.liveNow/, 'Badge should display the translated LIVE NOW label')
assert.match(app, /fixed/, 'Badge should use fixed positioning')
assert.match(app, /onMatchSelect\(liveMatches\[0\]\.id\)/, 'Single live match should open directly')
assert.match(app, /setOpen\(\(current\) => !current\)/, 'Multiple live matches should toggle a list')
assert.match(app, /liveMatches\.map/, 'Multiple live matches should render a selectable list')
assert.match(app, /activeView !== 'admin'/, 'Badge should be hidden from admin page')
assert.match(app, /<LiveNowFloatingBadge[\s\S]*liveMatches=\{liveMatches\}[\s\S]*onMatchSelect=\{openMatch\}/, 'Badge should be wired to public app routing')

console.log('live now badge checks passed')
