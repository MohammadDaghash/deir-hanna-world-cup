import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.jsx', 'utf8')
const localization = readFileSync('src/utils/localization.js', 'utf8')

const navBlock = app.slice(app.indexOf('const navItems = ['), app.indexOf('const starterCount'))
const navOrder = [...navBlock.matchAll(/\{ id: '([^']+)'/g)].map((match) => match[1])

assert.deepEqual(
  navOrder,
  ['overview', 'matches', 'tables', 'teams', 'knockout', 'leaders', 'admin'],
  'top navigation should show Overview, Matches, Standings, Teams, Knockout, Stats, Admin',
)
assert.match(app, /const publicNavItems = navItems/, 'Teams and Admin should be present in the main top nav')
assert.doesNotMatch(app, /!\['teams', 'admin'\]\.includes/, 'Teams/Admin should not be hidden from public nav')
assert.doesNotMatch(app, /activeView !== 'admin' && !adminUnlocked/, 'Admin should not be duplicated as a separate shortcut button')

assert.match(app, /<TeamsBoard[\s\S]*standings=\{standings\}/, 'Teams page should receive standings for records')
assert.match(app, /function TeamsBoard\(\{ onTeamSelect, playersByTeam, standings, teams \}\)/)
assert.match(app, /const standing = getTeamStandingRow\(standings, team\.id\)/)
assert.match(app, /getLocalizedGroupLabel\(standing\?\.group \?\? getTeamGroupCode\(team\), ui\)/)
assert.match(app, /function formatStandingRecord\(standing, ui\)/)
assert.match(app, /return ui\.noRecordYet/)
assert.match(app, /formatStandingRecord\(standing, ui\)/)
assert.match(app, /\{ui\.players\}: \{players\.length\}/)

assert.equal(
  localization.match(/allTeams:/g)?.length,
  3,
  'Teams page all-teams label should be translated in EN, HE, and AR',
)
assert.equal(
  localization.match(/noRecordYet:/g)?.length,
  3,
  'Teams page empty-record label should be translated in EN, HE, and AR',
)

console.log('teams navigation checks passed')
