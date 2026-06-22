import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.jsx', 'utf8')
const localization = readFileSync('src/utils/localization.js', 'utf8')

function functionBody(name) {
  const start = app.indexOf(`function ${name}(`)
  assert.notEqual(start, -1, `${name} should exist`)

  const next = app.indexOf('\nfunction ', start + 1)
  return app.slice(start, next === -1 ? app.length : next)
}

const labelHelper = functionBody('getKnockoutDecisionLabel')
const mobilePath = functionBody('MobileKnockoutPath')
const mobileMatch = functionBody('MobileBracketMatch')
const bracketMatchNode = functionBody('BracketMatchNode')

assert.match(labelHelper, /tournamentFormat\.stages\.semiFinal[\s\S]*ui\.winnerAdvances/, 'semi-finals should keep winner advances')
assert.match(labelHelper, /tournamentFormat\.stages\.final[\s\S]*ui\.championDecided/, 'final should show champion decided')
assert.match(labelHelper, /tournamentFormat\.stages\.thirdPlace[\s\S]*ui\.thirdPlaceDecided/, 'third-place should use a dedicated label')

assert.match(mobileMatch, /getKnockoutDecisionLabel\(stage, ui\)/, 'mobile bracket footer should use stage-aware labels')
assert.doesNotMatch(mobileMatch, /finalStage\s*\?\s*ui\.championDecided\s*:\s*ui\.winnerAdvances/, 'mobile bracket should not treat third place as winner advances')
assert.match(bracketMatchNode, /getKnockoutDecisionLabel\(match\.stage, ui\)/, 'desktop bracket nodes should use stage-aware labels')
assert.match(mobilePath, /stage:\s*tournamentFormat\.stages\.thirdPlace/, 'third-place mobile slot should carry stage metadata')
assert.doesNotMatch(mobileMatch, /thirdPlace[\s\S]*winnerAdvances/, 'mobile third-place path should not use winner advances directly')
assert.doesNotMatch(bracketMatchNode, /thirdPlace[\s\S]*winnerAdvances/, 'desktop third-place path should not use winner advances directly')

assert.match(localization, /thirdPlaceDecided: 'Third place decided'/, 'English third-place label should exist')
assert.match(localization, /thirdPlaceDecided: 'המקום השלישי נקבע'/, 'Hebrew third-place label should exist')
assert.match(localization, /thirdPlaceDecided: 'تحديد المركز الثالث'/, 'Arabic third-place label should exist')

console.log('knockout decision label checks passed')
