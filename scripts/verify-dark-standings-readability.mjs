import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.jsx', 'utf8')
const css = readFileSync('src/App.css', 'utf8')
const packageJson = readFileSync('package.json', 'utf8')

assert.match(app, /function GroupStandingsTable\(/, 'GroupStandingsTable should exist')
assert.match(app, /function StandingTableRow\(/, 'StandingTableRow should exist')
assert.match(app, /mode === 'short'/, 'Short standings mode should still exist')
assert.match(app, /id: 'full'/, 'Full standings mode should still exist')

assert.match(css, /\.theme-dark \.standings-table-shell/, 'dark mode should target standings table shells')
assert.match(css, /\.theme-dark \.standings-table/, 'dark mode should target standings tables')
assert.match(css, /\.theme-dark \.standings-table thead/, 'dark mode should style standings table headers')
assert.match(css, /\.theme-dark \.standing-row-qualified/, 'dark mode should style qualified standings rows')
assert.match(css, /\.theme-dark \.standing-row-live/, 'dark mode should style live standings rows')
assert.match(css, /\.theme-dark \.standing-row-rematch/, 'dark mode should style rematch standings rows')
assert.match(css, /\.theme-dark \.standing-rank-qualified/, 'dark mode should style qualified rank badges')
assert.match(css, /\.theme-dark \.standing-team-name/, 'dark mode should force team-name contrast')
assert.match(css, /\.theme-dark \.standing-team-code/, 'dark mode should force team-code contrast')
assert.match(css, /\.theme-dark \.standing-stat-cell/, 'dark mode should force WDL stat contrast')
assert.match(css, /\.theme-dark \.standing-points-cell/, 'dark mode should force points contrast')
assert.match(css, /\.theme-dark \.compact-standing-row/, 'dark mode should cover overview compact standings rows')
assert.match(css, /overflow-x: auto/, 'standings tables should keep table-local horizontal scrolling on mobile')

assert.match(app, /standings-table-shell/, 'Group standings shell should use standings class hooks')
assert.match(app, /standings-table/, 'Group standings table should use standings class hooks')
assert.match(app, /standing-row-qualified/, 'Qualified row should use a specific class hook')
assert.match(app, /standing-rank-qualified/, 'Qualified rank badge should use a specific class hook')
assert.match(app, /standing-team-name/, 'Team names should use a specific class hook')
assert.match(app, /standing-team-code/, 'Team codes should use a specific class hook')
assert.match(app, /standing-stat-cell/, 'WDL stat cells should use a specific class hook')
assert.match(app, /standing-points-cell/, 'Points cells should use a specific class hook')
assert.match(app, /compact-standing-row/, 'Overview standings rows should use a specific class hook')

assert.match(packageJson, /"verify:dark-standings-readability"/, 'package script should expose dark standings verification')

console.log('dark standings readability checks passed')
