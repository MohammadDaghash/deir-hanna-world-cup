import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.jsx', 'utf8')

assert.match(app, /function buildWhatsAppMatchMessage/)
assert.match(app, /function openWhatsAppMatchShare/)
assert.match(app, /https:\/\/wa\.me\/\?text=/)
assert.match(app, /Follow live:/)
assert.match(app, /Deir Hanna World Cup/)
assert.match(app, /Score:/)
assert.match(app, /Fixture:/)
assert.match(app, /Final Result:/)
assert.match(app, /Minute:/)
assert.match(app, /Goals:/)

const matchCenterStart = app.indexOf('function MatchCenterPage(')
const matchCenterEnd = app.indexOf('function MatchShareCardPanel(')
assert.notEqual(matchCenterStart, -1, 'MatchCenterPage should exist')
assert.notEqual(matchCenterEnd, -1, 'MatchShareCardPanel should follow MatchCenterPage')
const matchCenterBody = app.slice(matchCenterStart, matchCenterEnd)

assert.match(matchCenterBody, /openWhatsAppMatchShare\(\{ match, now, teams \}\)/)
assert.match(matchCenterBody, /\{ui\.share\}/)

console.log('whatsapp-share checks passed')
