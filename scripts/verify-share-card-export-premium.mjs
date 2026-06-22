import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.jsx', 'utf8')

function functionBody(name) {
  const start = app.indexOf(`function ${name}(`)
  assert.notEqual(start, -1, `${name} should exist`)

  const next = app.indexOf('\nfunction ', start + 1)
  return app.slice(start, next === -1 ? app.length : next)
}

const logoBuilder = functionBody('buildShareCardTeamLogo')
const shareSvgBuilder = functionBody('buildMatchShareCardSvg')
const panel = functionBody('MatchShareCardPanel')
const formatsStart = app.indexOf('const shareCardFormats = [')
const formatsEnd = app.indexOf(']', formatsStart)
const formats = app.slice(formatsStart, formatsEnd)

assert.match(app, /function encodeSvgDataUri\(/, 'share-card export should encode local flag SVGs as data URIs')
assert.match(app, /async function loadShareCardFlagData\(/, 'share-card export should load flag SVGs before preview/export')
assert.match(app, /ALB[\s\S]*MAR/, 'Albania and Morocco flags should be explicitly supported by the export path')
assert.match(formats, /value: 'story'/, 'Story should be the only share-card format')
assert.match(formats, /width: 1080[\s\S]*height: 1920/, 'Story format should export at 1080x1920')
assert.doesNotMatch(formats, /value: 'square'/, 'Square format must be removed')
assert.doesNotMatch(panel, /setSelectedFormatValue/, 'Share card panel should not show a format selector')
assert.doesNotMatch(panel, /shareCardFormats\.map/, 'Share card panel should not render Square/Story option buttons')
assert.match(logoBuilder, /flagDataByCode/, 'team logo builder should receive preloaded flag data')
assert.match(logoBuilder, /data:image\/svg\+xml/, 'team logo builder should render inline SVG flag data')
assert.doesNotMatch(logoBuilder, /href="\$\{escapeXml\(flag\.path\)\}"/, 'share-card SVG must not reference relative public flag paths')
assert.doesNotMatch(logoBuilder, /team\.secondary/, 'known share-card flags should not fall back to team-color placeholder circles')
assert.match(shareSvgBuilder, /premiumBurst/, 'share card should include premium sports background layers')
assert.match(shareSvgBuilder, /scorePlate/, 'share card should emphasize score with a named score plate')
assert.match(shareSvgBuilder, /storyBackdrop/, 'Story card should include a named story backdrop layer')
assert.match(shareSvgBuilder, /matchGlassPanel/, 'Story match panel should use a dark glass surface')
assert.match(shareSvgBuilder, /stadiumPanelGlow/, 'Story match panel should include stadium-style depth lighting')
assert.match(shareSvgBuilder, /pitchTexture/, 'Story match panel should include subtle stadium/pitch texture')
assert.match(shareSvgBuilder, /matchHeroSheen/, 'Story match panel should include a restrained highlight layer')
assert.doesNotMatch(shareSvgBuilder, /height="488" rx="44" fill="#f6f7f2"/, 'Story match panel must not use the old flat white hero background')
assert.match(shareSvgBuilder, /eventDeck/, 'Story card should include a compact event deck')
assert.match(shareSvgBuilder, /buildShareCardTeamLogo\(home,[\s\S]*250/, 'Story card should render larger home flag')
assert.match(shareSvgBuilder, /buildShareCardTeamLogo\(away,[\s\S]*250/, 'Story card should render larger away flag')
assert.match(shareSvgBuilder, /buildShareEventColumn\(\{[\s\S]*side: 'home'/, 'home events should remain on the home side')
assert.match(shareSvgBuilder, /buildShareEventColumn\(\{[\s\S]*side: 'away'/, 'away events should remain on the away side')
assert.match(functionBody('buildShareEventColumn'), /compactEmptyState/, 'empty event state should be compact')
assert.match(panel, /loadShareCardFlagData/, 'preview should wait for flag data')
assert.match(panel, /previewSvg/, 'preview SVG should be generated from loaded flag data')
assert.match(functionBody('generateMatchShareCardBlob'), /loadShareCardFlagData/, 'download/share export should wait for flag data')

console.log('share-card export premium checks passed')
