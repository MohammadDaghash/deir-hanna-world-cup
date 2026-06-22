import assert from 'node:assert/strict'
import {
  getLanguageDirection,
  getPlayerName,
  getTeamName,
  getUiDictionary,
  languageOptions,
  normalizeLanguage,
} from '../src/utils/localization.js'

const requiredKeys = [
  'matches',
  'standings',
  'knockout',
  'stats',
  'admin',
  'login',
  'save',
  'goals',
  'assists',
  'yellowCards',
  'redCards',
  'table',
  'rules',
  'live',
  'finished',
  'scheduled',
]

for (const { id } of languageOptions) {
  const ui = getUiDictionary(id)

  for (const key of requiredKeys) {
    assert.equal(typeof ui[key], 'string', `${id}.${key} should be translated`)
    assert.ok(ui[key].trim(), `${id}.${key} should not be empty`)
  }
}

assert.equal(getLanguageDirection('en'), 'ltr')
assert.equal(getLanguageDirection('he'), 'rtl')
assert.equal(getLanguageDirection('ar'), 'rtl')
assert.equal(normalizeLanguage('unknown'), 'en')

const team = {
  country: 'Fallback Team',
  countryEn: 'English Team',
  countryHe: 'קבוצה בעברית',
  countryAr: 'فريق عربي',
}

const player = {
  name: 'Fallback Player',
  nameEn: 'English Player',
  nameHe: 'שחקן בעברית',
  nameAr: 'لاعب عربي',
}

assert.equal(getTeamName(team, 'en'), team.countryEn)
assert.equal(getTeamName(team, 'he'), team.countryHe)
assert.equal(getTeamName(team, 'ar'), team.countryAr)
assert.equal(getPlayerName(player, 'en'), player.nameEn)
assert.equal(getPlayerName(player, 'he'), player.nameHe)
assert.equal(getPlayerName(player, 'ar'), player.nameAr)

console.log('Localization checks passed.')
