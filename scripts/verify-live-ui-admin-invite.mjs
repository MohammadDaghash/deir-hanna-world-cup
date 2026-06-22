import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { tournamentFormat } from '../src/config/tournamentFormat.js'
import { getVenueName } from '../src/utils/localization.js'

const app = readFileSync('src/App.jsx', 'utf8')
const service = readFileSync('src/services/tournamentService.js', 'utf8')
const schema = readFileSync('supabase/schema.sql', 'utf8')
const seed = readFileSync('scripts/generate-supabase-seed.mjs', 'utf8')

assert.equal(tournamentFormat.fixedVenue, 'El Capitano Stadium - Deir Hanna')
assert.equal(tournamentFormat.fixedVenueEn, 'El Capitano Stadium - Deir Hanna')
assert.equal(tournamentFormat.fixedVenueAr, 'ملعب الكابيتانو ديرحنا (السهل)')
assert.equal(tournamentFormat.fixedVenueHe, 'אצטדיון אל קפיטנו - דיר חנא')

assert.equal(getVenueName({}, 'en'), tournamentFormat.fixedVenueEn)
assert.equal(getVenueName({}, 'ar'), tournamentFormat.fixedVenueAr)
assert.equal(getVenueName({}, 'he'), tournamentFormat.fixedVenueHe)

assert.doesNotMatch(app, /\bBell\b/, 'Reminder Bell icon should be removed from App.jsx')
assert.doesNotMatch(app, /setReminder/, 'Reminder labels/handlers should not remain in App.jsx')
assert.doesNotMatch(app, /Reminder/, 'Reminder aria labels should not remain in App.jsx')

assert.match(app, /function MatchScoreRows\(/, 'Mobile-safe score rows component should exist')
assert.match(app, /<MatchScoreRows match=\{match\} home=\{home\} away=\{away\}/, 'LiveMatch should render score rows')
assert.match(app, /<MatchScoreRows match=\{primaryMatch\} home=\{primaryHome\} away=\{primaryAway\}/, 'Live floating badge should render score rows')
assert.match(
  app,
  /homeScore:[\s\S]*match\.homeScore[\s\S]*awayScore:[\s\S]*match\.awayScore/,
  'Score rows should explicitly bind home score to home team and away score to away team',
)

assert.match(service, /export async function inviteAdmin\(/, 'Service should expose inviteAdmin')
assert.match(service, /\.from\('admin_users'\)[\s\S]*upsert/, 'inviteAdmin should write to admin_users without duplicates')
assert.match(app, /function InviteAdminPanel\(/, 'Admin UI should include InviteAdminPanel')
assert.match(app, /adminUnlocked[\s\S]*<InviteAdminPanel/, 'Invite Admin must be rendered only for unlocked admins')
assert.match(app, /onInviteAdmin=\{handleInviteAdmin\}/, 'Admin invite handler should be wired')
assert.match(schema, /Admins can invite admin users/, 'Schema should allow admins to insert admin users')

assert.doesNotMatch(schema, /El Maracana Stadium - Deir Hanna/, 'Schema should not keep old venue text')
assert.doesNotMatch(seed, /El Maracana Stadium - Deir Hanna/, 'Seed generator should not keep old venue text')
assert.doesNotMatch(app, /El Maracana Stadium - Deir Hanna/, 'App should not keep old venue text')
assert.doesNotMatch(service, /El Maracana Stadium - Deir Hanna/, 'Service should not keep old venue text')

console.log('live UI and admin invite checks passed')
