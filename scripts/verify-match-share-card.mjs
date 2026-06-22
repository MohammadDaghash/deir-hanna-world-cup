import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.jsx', 'utf8')

assert.match(app, /function MatchShareCardPanel/)
assert.match(app, /function buildMatchShareCardSvg/)
assert.match(app, /async function generateMatchShareCardBlob/)
assert.match(app, /async function downloadMatchShareCard/)
assert.match(app, /async function shareMatchShareCard/)
assert.match(app, /const shareCardFormats = \[/)
assert.match(app, /value: 'story'[\s\S]*width: 1080[\s\S]*height: 1920/)
assert.doesNotMatch(app, /value: 'square'/)
assert.match(app, /ui\.downloadImage/)
assert.match(app, /ui\.shareImageButton/)
assert.match(app, /getMatchShareEventGroups/)
assert.match(app, /formatShareEventPlayerLabel/)
assert.match(app, /buildSvgTextBlock/)
assert.match(app, /ui\.matchEvents/)
assert.match(app, /ui\.tournamentTitle/)
assert.doesNotMatch(app, />Deir Hanna World Cup</)

const matchCenterStart = app.indexOf('function MatchCenterPage(')
const matchCenterEnd = app.indexOf('function DetailTopBar(')
assert.notEqual(matchCenterStart, -1, 'MatchCenterPage should exist')
assert.notEqual(matchCenterEnd, -1, 'DetailTopBar should follow MatchCenterPage')
const matchCenterBody = app.slice(matchCenterStart, matchCenterEnd)

assert.match(matchCenterBody, /<MatchShareCardPanel/)
assert.match(matchCenterBody, /match=\{match\}/)
assert.match(matchCenterBody, /teams=\{teams\}/)

console.log('match-share-card checks passed')
