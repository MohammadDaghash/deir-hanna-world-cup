import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.jsx', 'utf8')

function functionBody(name) {
  const start = app.indexOf(`function ${name}(`)
  assert.notEqual(start, -1, `${name} should exist`)

  const next = app.indexOf('\nfunction ', start + 1)
  return app.slice(start, next === -1 ? app.length : next)
}

const eventColumn = functionBody('buildShareEventColumn')
const eventRows = functionBody('buildShareEventRows')
const eventPlayerLabel = functionBody('formatShareEventPlayerLabel')
const shareSvg = functionBody('buildMatchShareCardSvg')

assert.match(
  app,
  /function buildSvgTextBlock\(/,
  'share exports should use a bounded multiline SVG text helper',
)
assert.match(
  app,
  /maxLines === 1[\s\S]*String\(value \?\? ''\)\.trim\(\)/,
  'single-line export labels should preserve full player and team names',
)
assert.match(
  shareSvg,
  /const isRtl = ui\.currentLanguage !== 'en'/,
  'share export should explicitly identify RTL languages',
)
assert.match(
  shareSvg,
  /headerTitleAnchor/,
  'share export should choose a safe title anchor for RTL',
)
assert.match(
  shareSvg,
  /buildSvgTextBlock\(\{[\s\S]*maxWidth:/,
  'share export title should have a bounded width',
)
assert.match(
  eventRows,
  /formatStoredEventMinute\(event\)/,
  'event row data should format minutes independently from player names',
)
assert.match(
  eventColumn,
  /row\.minutes\.join/,
  'grouped event rows should render all stored minutes separately from player names',
)
assert.match(
  eventColumn,
  /direction="ltr" unicode-bidi="plaintext"/,
  'event minutes and compact markers should stay direction-stable in RTL exports',
)
assert.match(
  eventPlayerLabel,
  /getEventPlayerDisplayName\(event,\s*players,\s*ui\)/,
  'event player names should resolve from saved multilingual player fields',
)
assert.doesNotMatch(
  eventColumn,
  /formatShareEventLine\(event/,
  'event rows should not combine mixed-direction minute and player text',
)
assert.match(
  eventColumn,
  /playerTextX/,
  'event rows should reserve a bounded player-name region',
)
assert.match(
  eventColumn,
  /direction: textDirection/,
  'event player names should preserve the selected language direction',
)
assert.match(
  eventColumn,
  /const playerTextAnchor = 'start'/,
  'event player names should use SVG start anchoring so RTL text flows inward from the right edge',
)
assert.doesNotMatch(
  eventColumn,
  /textDirection === 'rtl' \? 'end'/,
  'RTL event player names must not use end anchoring because SVG direction flips the physical anchor',
)
assert.match(
  eventColumn,
  /textDirection === 'rtl'[\s\S]*\? nameColumnStart \+ nameColumnWidth[\s\S]*: nameColumnStart/,
  'RTL event player names should be positioned from the physical right edge of the reserved name column',
)
assert.match(
  shareSvg,
  /footerTitleX/,
  'footer title should use a safe RTL-aware position',
)

console.log('share-card RTL checks passed')
