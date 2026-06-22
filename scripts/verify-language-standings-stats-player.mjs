import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  getLanguageDirection,
  getStoredLanguage,
  getUiDictionary,
  normalizeLanguage,
} from '../src/utils/localization.js'

const app = fs.readFileSync('src/App.jsx', 'utf8')
const localization = fs.readFileSync('src/utils/localization.js', 'utf8')
const schema = fs.readFileSync('supabase/schema.sql', 'utf8')
const migrations = fs.readdirSync('supabase/migrations')
  .filter((file) => file.endsWith('.sql'))
  .map((file) => fs.readFileSync(`supabase/migrations/${file}`, 'utf8'))
  .join('\n')

function functionBody(name) {
  const start = app.indexOf(`function ${name}(`)
  assert.notEqual(start, -1, `${name} should exist`)

  const next = app.indexOf('\nfunction ', start + 1)
  return app.slice(start, next === -1 ? app.length : next)
}

const tablesBoard = functionBody('TablesBoard')
const groupStandingsTable = functionBody('GroupStandingsTable')
const leadersBoard = functionBody('LeadersBoard')
const playerPage = functionBody('PlayerPage')
const playerMiniChart = functionBody('PlayerMiniChart')

delete globalThis.window
assert.equal(normalizeLanguage(null), 'en', 'Missing translation fallback should remain English')
assert.equal(getStoredLanguage(), 'ar', 'Server/no-window language should default to Arabic')
assert.equal(getLanguageDirection('ar'), 'rtl', 'Arabic direction should be RTL')
assert.equal(getUiDictionary('ar').tournamentTitle, 'موندياليتو ديرحنا', 'Arabic title should use the requested tournament name')
assert.equal(getUiDictionary('en').tournamentTitle, 'Deir Hanna World Cup', 'English title should remain Deir Hanna World Cup')
assert.equal(typeof getUiDictionary('he').tournamentTitle, 'string', 'Hebrew title should exist')

globalThis.window = {
  localStorage: {
    getItem: () => 'en',
  },
}
assert.equal(getStoredLanguage(), 'en', 'Saved language preference should override Arabic default')
delete globalThis.window

for (const language of ['en', 'he', 'ar']) {
  const ui = getUiDictionary(language)

  for (const key of ['shortTable', 'fullTable', 'wonShort', 'drawnShort', 'lostShort', 'pointsShort', 'goalsByMatch']) {
    assert.equal(typeof ui[key], 'string', `${language}.${key} should exist`)
    assert.ok(ui[key].trim(), `${language}.${key} should not be empty`)
  }
}

assert.doesNotMatch(app, />Deir Hanna World Cup</, 'App should not hardcode the visible tournament title')
assert.match(app, /ui\.tournamentTitle/, 'App should render tournament title from translations')
assert.match(schema, /a\.a\.sportive@gmail\.com/, 'Schema should include the new admin email')
assert.match(migrations, /a\.a\.sportive@gmail\.com/, 'A migration should insert the new admin email')

assert.match(tablesBoard, /useState\('short'\)/, 'Standings should default to short table mode')
assert.match(tablesBoard, /setTableMode/, 'Standings should expose a table mode toggle')
assert.match(tablesBoard, /ui\.shortTable/, 'Standings toggle should use short table translation')
assert.match(tablesBoard, /ui\.fullTable/, 'Standings toggle should use full table translation')
assert.match(groupStandingsTable, /mode = 'short'/, 'Group standings table should accept a mode prop')
assert.match(groupStandingsTable, /shortColumns/, 'Group standings table should render short columns')
assert.match(groupStandingsTable, /fullColumns/, 'Group standings table should keep full columns')

assert.match(leadersBoard, /lg:grid-cols-2/, 'Stats page should wrap to two cards per row on desktop')
assert.match(leadersBoard, /2xl:grid-cols-3/, 'Stats page should cap at three cards on large desktop')
assert.doesNotMatch(leadersBoard, /xl:grid-cols-5/, 'Stats page should not force five narrow cards in one row')
assert.match(app, /leaderboard-identity/, 'Leaderboard rows should use readable identity blocks')

assert.doesNotMatch(playerPage, /ui\.assists/, 'Player details should not show an assists stat card')
assert.doesNotMatch(playerPage, /ui\.contributions/, 'Player details should not show contributions section')
assert.doesNotMatch(playerPage, /goalsAssistsByMatch/, 'Player details should not show goals/assists chart title')
assert.doesNotMatch(playerPage, /getPlayerContributions/, 'Player details should not calculate contribution rows')
assert.doesNotMatch(playerPage, /assistPlayerId|event\.assist|liveEventTypes\.assist/, 'Player details should not count assists')
assert.match(playerPage, /ui\.goalsByMatch/, 'Player details should title chart as Goals by Match')
assert.match(playerPage, /ui\.noGoalsRecordedYet/, 'Player details should show no-goals empty state')
assert.doesNotMatch(playerMiniChart, /assists|0A|G\/A/, 'Player mini chart should render goals only')

console.log('language, standings, stats, and player detail checks passed')
