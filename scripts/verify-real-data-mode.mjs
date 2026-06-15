import {
  lineups,
  matches,
  knockoutMatches,
  players,
  teams,
} from '../src/data/tournament.js'
import {
  getPlayerName,
  getTeamName,
  getVenueName,
} from '../src/utils/localization.js'

const failures = []

if (teams.length !== 0) failures.push(`expected no demo teams, found ${teams.length}`)
if (players.length !== 0) failures.push(`expected no demo players, found ${players.length}`)
if (matches.length !== 0) failures.push(`expected no demo league matches, found ${matches.length}`)
if (knockoutMatches.length !== 0) failures.push(`expected no demo knockout matches, found ${knockoutMatches.length}`)
if (Object.keys(lineups).length !== 0) failures.push(`expected no demo lineups, found ${Object.keys(lineups).length}`)

const sampleTeam = {
  country: 'Fallback Team',
  countryEn: 'English Team',
  countryHe: 'קבוצה בעברית',
  countryAr: 'فريق عربي',
}
const samplePlayer = {
  name: 'Fallback Player',
  nameEn: 'English Player',
  nameHe: 'שחקן בעברית',
  nameAr: 'لاعب عربي',
}
const sampleMatch = {
  venue: 'Fallback Stadium',
  venueEn: 'English Stadium',
  venueHe: 'אצטדיון בעברית',
  venueAr: 'ملعب عربي',
}

if (getTeamName(sampleTeam, 'he') !== sampleTeam.countryHe) failures.push('Hebrew team name was not selected')
if (getTeamName(sampleTeam, 'ar') !== sampleTeam.countryAr) failures.push('Arabic team name was not selected')
if (getPlayerName(samplePlayer, 'he') !== samplePlayer.nameHe) failures.push('Hebrew player name was not selected')
if (getPlayerName(samplePlayer, 'ar') !== samplePlayer.nameAr) failures.push('Arabic player name was not selected')
if (getVenueName(sampleMatch, 'he') !== sampleMatch.venueHe) failures.push('Hebrew venue name was not selected')
if (getVenueName(sampleMatch, 'ar') !== sampleMatch.venueAr) failures.push('Arabic venue name was not selected')

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('real-data mode checks passed')
