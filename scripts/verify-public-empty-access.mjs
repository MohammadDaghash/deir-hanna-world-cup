import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.jsx', 'utf8')

function section(startNeedle, endNeedle) {
  const start = app.indexOf(startNeedle)
  const end = app.indexOf(endNeedle, start + 1)
  assert.notEqual(start, -1, `${startNeedle} should exist`)
  assert.notEqual(end, -1, `${endNeedle} should exist after ${startNeedle}`)
  return app.slice(start, end)
}

const appComponent = section('function App()', 'function BrandLogo(')
const adminBoard = section('function AdminBoard(', 'function QrPosterPanel(')

assert.doesNotMatch(appComponent, /!hasTournamentData[\s\S]*<EmptyTournamentPanel/, 'public empty data should not render an admin-login empty state')
assert.doesNotMatch(appComponent, /hasTournamentData\s*&&\s*!isDetailRoute\s*&&\s*activeView === 'overview'/, 'overview should render without tournament data')
assert.doesNotMatch(appComponent, /hasTournamentData\s*&&\s*!isDetailRoute\s*&&\s*activeView === 'teams'/, 'teams page should render without tournament data')
assert.doesNotMatch(appComponent, /hasTournamentData\s*&&\s*!isDetailRoute\s*&&\s*activeView === 'matches'/, 'matches page should render without tournament data')
assert.doesNotMatch(appComponent, /hasTournamentData\s*&&\s*!isDetailRoute\s*&&\s*activeView === 'tables'/, 'standings page should render without tournament data')
assert.doesNotMatch(appComponent, /hasTournamentData\s*&&\s*!isDetailRoute\s*&&\s*activeView === 'knockout'/, 'knockout page should render without tournament data')
assert.doesNotMatch(appComponent, /hasTournamentData\s*&&\s*!isDetailRoute\s*&&\s*activeView === 'leaders'/, 'stats page should render without tournament data')
assert.match(appComponent, /!isDetailRoute && activeView === 'overview' &&/, 'overview should render by active view only')
assert.match(appComponent, /!isDetailRoute && activeView === 'teams' &&/, 'teams should render by active view only')
assert.match(appComponent, /!isDetailRoute && activeView === 'matches' &&/, 'matches should render by active view only')
assert.match(appComponent, /!isDetailRoute && activeView === 'tables' &&/, 'standings should render by active view only')
assert.match(appComponent, /!isDetailRoute && activeView === 'knockout' &&/, 'knockout should render by active view only')
assert.match(appComponent, /!isDetailRoute && activeView === 'leaders' &&/, 'stats should render by active view only')
assert.match(adminBoard, /ui\.sendLoginLink/, 'admin login should remain inside AdminBoard')
assert.match(adminBoard, /if \(!adminUnlocked\)/, 'admin tools should remain gated behind admin unlock')
assert.doesNotMatch(app, /function EmptyTournamentPanel\(/, 'public admin-login empty panel should be removed')

console.log('public empty access checks passed')
