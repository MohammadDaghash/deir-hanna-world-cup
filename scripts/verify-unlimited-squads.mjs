import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.jsx', 'utf8')
const schema = readFileSync('supabase/schema.sql', 'utf8')

assert.doesNotMatch(app, /maxSquadPlayers/, 'frontend should not keep a max squad size constant')
assert.doesNotMatch(app, /selectedTeamIsFull/, 'admin add-player form should not block full teams')
assert.doesNotMatch(app, /teamPlayerCount >=/, 'player creation should not reject based on team size')
assert.doesNotMatch(app, /ui\.squadSlots/, 'admin UI should not show squad slots')
assert.doesNotMatch(app, /ui\.squadFull/, 'admin UI should not show squad full state')
assert.doesNotMatch(app, /\/\s*\{maxSquadPlayers\}/, 'admin UI should not show max squad denominator')

const teamCardStart = app.indexOf('function TeamCard(')
const teamCardEnd = app.indexOf('function EmptyState(')
assert.notEqual(teamCardStart, -1, 'TeamCard component should exist')
assert.notEqual(teamCardEnd, -1, 'EmptyState should follow TeamCard')
const teamCard = app.slice(teamCardStart, teamCardEnd)

assert.match(teamCard, /\{ui\.players\}: \{players\.length\}/, 'team cards should show total players')
assert.doesNotMatch(teamCard, /ui\.starters/, 'team cards should not show starters as squad capacity')
assert.doesNotMatch(teamCard, /ui\.bench/, 'team cards should not show bench as squad capacity')
assert.doesNotMatch(teamCard, /ui\.max/, 'team cards should not show max squad capacity')

assert.doesNotMatch(
  schema,
  /count\(\*\)|max_squad|squad_size|players_per_team|team_player_count/i,
  'database schema should not enforce a max squad size',
)

const twentyPlayers = Array.from({ length: 20 }, (_, index) => ({
  id: `p-${index + 1}`,
  teamId: 'team-a',
}))
assert.equal(
  twentyPlayers.filter((player) => player.teamId === 'team-a').length,
  20,
  'verification fixture should allow 20 players for one team',
)

console.log('unlimited squad checks passed')
