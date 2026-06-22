import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.jsx', 'utf8')
const service = readFileSync('src/services/tournamentService.js', 'utf8')
const localization = readFileSync('src/utils/localization.js', 'utf8')

const removedAppTerms = [
  'Community Predictions',
  'TournamentPredictionsPanel',
  'TournamentVoteCard',
  'handleTournamentVote',
  'onTournamentVote',
  'tournamentVotes',
  'tournament_winner',
  'top_scorer',
  'best_player',
]

for (const term of removedAppTerms) {
  assert.equal(app.includes(term), false, `App should not contain tournament-wide prediction term: ${term}`)
}

assert.equal(service.includes('loadTournamentVotes'), false)
assert.equal(service.includes('saveTournamentVote'), false)
assert.equal(service.includes('Tournament-wide voting needs'), false)
assert.equal(service.includes('tournament_votes'), false)

assert.equal(app.includes('PredictionVote'), true, 'match-specific PredictionVote UI should remain')
assert.equal(app.includes('ui.whoWillWin'), true, 'match-specific winner prompt should be rendered through translations')
assert.equal(localization.includes("whoWillWin: 'Who will win?'"), true, 'English match-specific winner prompt should remain')
assert.equal(localization.includes("whoWillWin: 'מי ינצח?'"), true, 'Hebrew match-specific winner prompt should remain')
assert.equal(localization.includes("whoWillWin: 'من سيفوز؟'"), true, 'Arabic match-specific winner prompt should remain')
assert.equal(service.includes('loadVotes'), true, 'match_votes loading should remain')
assert.equal(service.includes('saveVote'), true, 'match_votes saving should remain')
assert.equal(service.includes('match_votes'), true, 'match_votes Supabase table usage should remain')

console.log('match-voting-only checks passed')
