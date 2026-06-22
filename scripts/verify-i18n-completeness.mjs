import assert from 'node:assert/strict'
import fs from 'node:fs'
import { getUiDictionary } from '../src/utils/localization.js'

const app = fs.readFileSync('src/App.jsx', 'utf8')
const localization = fs.readFileSync('src/utils/localization.js', 'utf8')

const requiredKeys = [
  'todayMatches',
  'qualificationRace',
  'latestMatchday',
  'leagueTable',
  'knockoutPath',
  'expand',
  'semiFinals',
  'noMatchesToday',
  'noMatchScheduledYet',
  'noMatchesAvailableForStageYet',
  'topAdvance',
  'topQualify',
  'completed',
  'schedule',
  'singleGameBracket',
  'league',
  'playedShort',
  'goalDifferenceShort',
  'pointsShort',
  'qualificationRules',
  'matchday',
  'editMatch',
  'loginAsAdmin',
  'whoWillWin',
  'liveNow',
  'matchEvents',
  'noMatchEventsYet',
  'quickMode',
  'qrPoster',
  'downloadPoster',
  'printPoster',
  'scanToFollow',
]

for (const language of ['en', 'he', 'ar']) {
  const ui = getUiDictionary(language)

  for (const key of requiredKeys) {
    assert.equal(typeof ui[key], 'string', `${language}.${key} should be a string`)
    assert.ok(ui[key].trim(), `${language}.${key} should not be empty`)
  }
}

const forbiddenRawStrings = [
  "Today's Matches",
  'Qualification Race',
  'Latest Matchday',
  'League Table',
  'Knockout Path',
  'No matches today.',
  'No match scheduled yet.',
  'No matches available for this stage yet.',
  'Single-game bracket',
  'Qualification Rules',
  'Login as admin',
]

for (const text of forbiddenRawStrings) {
  assert.ok(
    !app.includes(text),
    `App.jsx should not hardcode visible English label: ${text}`,
  )
}

assert.match(localization, /function missingTranslation/, 'Localization should log missing keys in development')
assert.match(localization, /t\(key/, 'Localization should expose a t(key) helper')
assert.match(app, /getMatchRoundLabel\(match, ui\)/, 'Match round labels should use localized UI text')
assert.match(app, /getStageLabel\(.*ui/, 'Stage labels should use localized UI text')
assert.match(app, /getTournamentTableLabel\(ui\)/, 'Table labels should use localized UI text')

console.log('i18n completeness checks passed')
