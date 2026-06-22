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
import {
  knockoutStageFilters,
  roundFilterOptions,
  stageOptions,
  tournamentFormat,
} from '../src/config/tournamentFormat.js'

const failures = []

if (teams.length !== 0) failures.push(`expected no demo teams, found ${teams.length}`)
if (players.length !== 0) failures.push(`expected no demo players, found ${players.length}`)
if (matches.length !== 0) failures.push(`expected no demo group-stage matches, found ${matches.length}`)
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
if (getVenueName(sampleMatch, 'he') !== tournamentFormat.fixedVenueHe) failures.push('Fixed venue was not selected for Hebrew')
if (getVenueName(sampleMatch, 'ar') !== tournamentFormat.fixedVenueAr) failures.push('Fixed venue was not selected for Arabic')
if (!stageOptions.some((stage) => /third/i.test(stage.label))) failures.push('Third Place is missing from stage options')
if (!knockoutStageFilters.some((stage) => /third/i.test(stage.label))) failures.push('Third Place is missing from knockout filters')
if (roundFilterOptions.filter((round) => /^group-/.test(round.id)).length !== tournamentFormat.groupStageRounds) {
  failures.push('Group-stage round filters do not match the configured format')
}

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('real-data mode checks passed')
