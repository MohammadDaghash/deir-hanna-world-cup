import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { getTeamFlag, teamFlagAssets, tournamentTeamCodes } from '../src/utils/teamFlags.js'

assert.deepEqual(
  tournamentTeamCodes,
  ['ALB', 'ALG', 'EGY', 'FRA', 'MAR', 'POR', 'QAT', 'TUR'],
  'Tournament flag code list should contain the final 8 teams',
)

for (const code of tournamentTeamCodes) {
  const flag = getTeamFlag({ code })

  assert.ok(flag, `${code} should resolve to a flag asset`)
  assert.equal(flag.code, code)
  assert.equal(teamFlagAssets[code].path, `/flags/${code.toLowerCase()}.svg`)

  const flagPath = join(process.cwd(), 'public', 'flags', `${code.toLowerCase()}.svg`)
  assert.ok(existsSync(flagPath), `${code} SVG should exist at ${flagPath}`)

  const svg = readFileSync(flagPath, 'utf8')
  assert.match(svg, /<svg[^>]+viewBox=/, `${code} SVG should define a viewBox`)
  assert.doesNotMatch(svg, /<script/i, `${code} SVG should not contain scripts`)
}

assert.equal(getTeamFlag({ code: 'BAD' }), null, 'Invalid team code should fall back cleanly')
assert.equal(getTeamFlag(null), null, 'Missing team should fall back cleanly')

const app = readFileSync('src/App.jsx', 'utf8')
assert.match(app, /import \{ getTeamFlag/, 'App should use the shared team flag lookup')
assert.match(app, /function FlagMark\(/, 'FlagMark component should still centralize UI badges')
assert.match(app, /<img/, 'FlagMark should render real flag images when available')
assert.match(app, /buildShareCardTeamLogo/, 'Share card should use real flag artwork')
assert.doesNotMatch(app, /style=\{\{ '--flag-a': team\.color/, 'FlagMark should not use team colors as the primary icon')

const css = readFileSync('src/App.css', 'utf8')
assert.match(css, /\.flag-mark-image/, 'Flag image CSS should preserve aspect ratio')
assert.match(css, /object-fit:\s*cover/, 'Flag images should not stretch or distort')

console.log('team flag checks passed')
