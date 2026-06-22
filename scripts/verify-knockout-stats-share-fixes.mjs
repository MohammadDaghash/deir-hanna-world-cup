import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  getKnockoutPlaceholderOptions,
  getShortMatchStageLabel,
  tournamentFormat,
} from '../src/config/tournamentFormat.js'
import { getTeamFlag } from '../src/utils/teamFlags.js'

const app = readFileSync('src/App.jsx', 'utf8')
const tournamentUtils = readFileSync('src/utils/tournament.js', 'utf8')
const localization = readFileSync('src/utils/localization.js', 'utf8')
const albaniaFlag = readFileSync('public/flags/alb.svg', 'utf8')

function componentBody(name) {
  const start = app.indexOf(`function ${name}(`)
  assert.notEqual(start, -1, `${name} should exist`)

  const next = app.indexOf('\nfunction ', start + 1)
  return app.slice(start, next === -1 ? app.length : next)
}

assert.deepEqual(
  getKnockoutPlaceholderOptions(tournamentFormat.stages.semiFinal).map((item) => item.value),
  ['A1', 'B2', 'B1', 'A2'],
  'semi-final placeholders should support A1/B2 and B1/A2',
)
assert.deepEqual(
  getKnockoutPlaceholderOptions(tournamentFormat.stages.final).map((item) => item.value),
  ['WS1', 'WS2'],
  'final placeholders should support semi-final winners',
)
assert.deepEqual(
  getKnockoutPlaceholderOptions(tournamentFormat.stages.thirdPlace).map((item) => item.value),
  ['LS1', 'LS2'],
  'third-place placeholders should support semi-final losers',
)
assert.equal(getShortMatchStageLabel(tournamentFormat.stages.semiFinal), 'Semi-final')

const matchDraftFields = componentBody('MatchDraftFields')
assert.match(matchDraftFields, /isGroupStage/, 'MatchDraftFields should branch by group stage vs knockout')
assert.match(matchDraftFields, /homeLabel/, 'Knockout draft should store placeholder labels')
assert.match(matchDraftFields, /awayLabel/, 'Knockout draft should store placeholder labels')
assert.match(app, /validateMatchDraft/, 'Match saving should validate contestant rules')

assert.doesNotMatch(app, /GROUP STAGE RO/, 'No truncated group-stage label should remain')
assert.doesNotMatch(app, /Group Stage Round/, 'Long group-stage round labels should not be used in UI code')
assert.match(app, /roundShort/, 'Short translated round labels should be used')

const leadersBoard = componentBody('LeadersBoard')
assert.doesNotMatch(leadersBoard, /leaderboards\.assists/, 'Stats page should not render assists leaderboard')
assert.doesNotMatch(leadersBoard, /leaderboards\.contributions/, 'Stats page should not render contributions leaderboard')
assert.match(leadersBoard, /teamGoalStats\.scored/, 'Stats page should render team goals scored')
assert.match(leadersBoard, /teamGoalStats\.conceded/, 'Stats page should render team goals conceded')
assert.match(tournamentUtils, /getTeamGoalStats/, 'Team goals scored/conceded should be calculated from matches')

assert.doesNotMatch(app, /\bStar\b/, 'Non-functional star button should be removed from App.jsx')

assert.match(app, /routeBackStack/, 'Detail navigation should preserve an in-app back stack')
assert.match(app, /handleDetailBack/, 'Detail pages should use centralized back navigation')
assert.match(app, /navigateToDetail/, 'Detail navigation should store previous route context')

assert.match(componentBody('buildShareCardTeamLogo'), /getTeamFlag/, 'Share card should use real flag lookup')
assert.match(componentBody('buildShareEventColumn'), /getShareEventMarker/, 'Share card events should show compact markers')
assert.match(componentBody('buildMatchShareCardSvg'), /filter id="cardShadow"/, 'Share card should use premium depth styling')

assert.equal(getTeamFlag({ code: 'ALB' })?.path, '/flags/alb.svg')
assert.match(albaniaFlag, /double-headed/i, 'Albania SVG should document the double-headed eagle')
assert.match(albaniaFlag, /viewBox="0 0 700 500"/, 'Albania SVG should use the standard flag viewBox')
assert.doesNotMatch(albaniaFlag, /<circle/i, 'Albania flag should not use fake circular eagle details')

;['roundShort', 'mostScored', 'fewestConceded'].forEach((key) => {
  assert.match(localization, new RegExp(`${key}:`), `${key} translation should exist`)
})

console.log('knockout, stats, share, and navigation fixes checks passed')
