import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.jsx', 'utf8')
const localization = readFileSync('src/utils/localization.js', 'utf8')

assert.match(
  app,
  /const detailTabs = \['Details', 'Players', 'Standings', 'Matches'\]/,
  'Match Details tabs should use Players instead of Lineups',
)
assert.doesNotMatch(app, /activeTab === 'Lineups'/, 'public Match Details should not render a Lineups tab')
assert.match(app, /activeTab === 'Players'/, 'public Match Details should render a Players tab')
assert.match(app, /function MatchPlayersPanel/, 'public Match Details should use a players panel')
assert.match(app, /function MatchTeamPlayersCard/, 'players panel should render one card per team')
assert.match(app, /function MatchPlayerRow/, 'players panel should render simple player rows')
assert.match(app, /onPlayerSelect\?\.\(player\.id\)/, 'clicking a player should open Player Details')

const playersPanelStart = app.indexOf('function MatchPlayersPanel')
const playersPanelEnd = app.indexOf('function MatchTeamLine')
assert.notEqual(playersPanelStart, -1, 'MatchPlayersPanel should exist')
assert.notEqual(playersPanelEnd, -1, 'MatchTeamLine should follow MatchPlayersPanel')
const playersPanel = app.slice(playersPanelStart, playersPanelEnd)

assert.doesNotMatch(playersPanel, /Starting Seven/i, 'public player tab should not show Starting Seven')
assert.doesNotMatch(playersPanel, /Bench/i, 'public player tab should not show Bench')
assert.doesNotMatch(playersPanel, /formation|3-3-1|VII/i, 'public player tab should not show formation labels or slots')
assert.match(playersPanel, /ui\.t\('teamPlayers'/, 'team players heading should be translated')
assert.match(playersPanel, /ui\.noPlayersRegistered/, 'empty state should be translated')

assert.equal(localization.match(/teamPlayers:/g)?.length, 3, 'team players label should be translated')
assert.equal(localization.match(/noPlayersRegistered:/g)?.length, 3, 'no players registered label should be translated')

console.log('match players tab checks passed')
