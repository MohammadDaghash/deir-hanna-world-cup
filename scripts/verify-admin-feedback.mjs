import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const localization = readFileSync(new URL('../src/utils/localization.js', import.meta.url), 'utf8')

const requiredAppMarkers = [
  'function AdminActionNotice',
  'const [adminNotice, setAdminNotice]',
  'const [pendingAdminAction, setPendingAdminAction]',
  'async function runAdminFormAction',
  'teamAddedSuccessfully',
  'playerAddedSuccessfully',
  'matchAddedSuccessfully',
  'changesSavedSuccessfully',
  'deletedSuccessfully',
  'setTeamDraft(createEmptyTeamDraft())',
  'setNewMatchDraft(createBlankMatchDraft(teams))',
  'setSelectedTeamId',
  'setSelectedPlayerId',
  'setSelectedMatchId',
  'pendingLabel=',
]

const requiredTranslationKeys = [
  'teamAddedSuccessfully',
  'playerAddedSuccessfully',
  'matchAddedSuccessfully',
  'changesSavedSuccessfully',
  'deletedSuccessfully',
  'adding',
  'saving',
  'deleting',
  'actionFailed',
]

for (const marker of requiredAppMarkers) {
  assert.ok(app.includes(marker), `Missing admin feedback app marker: ${marker}`)
}

for (const key of requiredTranslationKeys) {
  const occurrences = localization.match(new RegExp(`${key}:`, 'g')) ?? []
  assert.equal(occurrences.length, 3, `Expected ${key} in English, Hebrew, and Arabic dictionaries`)
}

assert.ok(
  /try\s*{[\s\S]*await action\(\)[\s\S]*setAdminNotice\(\{[\s\S]*type: 'success'/m.test(app),
  'Admin actions should show success only after awaited action succeeds',
)

assert.ok(
  /catch \(error\) \{[\s\S]*setAdminNotice\(\{[\s\S]*type: 'error'/m.test(app),
  'Admin actions should show localized error feedback when a request fails',
)

console.log('admin feedback checks passed')
