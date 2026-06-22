import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.jsx', 'utf8')
const css = readFileSync('src/App.css', 'utf8')

function functionBody(name) {
  const start = app.indexOf(`function ${name}(`)
  assert.notEqual(start, -1, `${name} should exist`)

  const next = app.indexOf('\nfunction ', start + 1)
  return app.slice(start, next === -1 ? app.length : next)
}

const loadLogo = functionBody('loadBrandLogoDataUrl')
const sharePanel = functionBody('MatchShareCardPanel')
const posterPanel = functionBody('QrPosterPanel')
const shareSvg = functionBody('buildMatchShareCardSvg')
const posterSvg = functionBody('buildPosterSvg')

assert.match(app, /function buildBrandLogoFallbackSvg\(/, 'export path should define a clean fallback logo SVG')
assert.match(app, /const brandLogoFallbackDataUrl = encodeSvgDataUri\(buildBrandLogoFallbackSvg\(\)\)/, 'fallback logo should be a data URI')
assert.match(loadLogo, /blobToDataUrl/, 'brand logo loader should convert the logo to a data URL')
assert.match(loadLogo, /brandLogoFallbackDataUrl/, 'brand logo loader should fall back to an inline logo, not a broken image path')
assert.doesNotMatch(loadLogo, /\.catch\(\(\) => getPublicAssetUrl\(brandLogoPath\)\)/, 'brand logo fallback must not return an external/public path for exports')

assert.match(sharePanel, /brandLogoUrl/, 'match share preview should keep loaded brand logo state')
assert.match(sharePanel, /loadBrandLogoDataUrl/, 'match share preview should load the export-safe brand logo')
assert.match(sharePanel, /buildMatchShareCardSvg\(\{[\s\S]*brandLogoUrl/, 'match share preview should pass the loaded logo into the SVG')

assert.match(posterPanel, /brandLogoUrl/, 'QR poster preview should keep loaded brand logo state')
assert.match(posterPanel, /loadBrandLogoDataUrl/, 'QR poster preview should load the export-safe brand logo')
assert.match(posterPanel, /buildPosterSvg\(\{[\s\S]*brandLogoUrl/, 'QR poster preview should pass the loaded logo into the SVG')

assert.match(shareSvg, /xlink:href="\$\{escapeXml\(brandLogoUrl\)\}"/, 'share SVG should include xlink href for image compatibility')
assert.match(posterSvg, /xmlns:xlink/, 'poster SVG should declare xlink namespace')
assert.match(posterSvg, /xlink:href="\$\{escapeXml\(brandLogoUrl\)\}"/, 'poster SVG should include xlink href for image compatibility')

assert.match(app, /hero-photo-tint/, 'hero should use named overlay classes for tuned photo visibility')
assert.match(app, /hero-photo-gradient/, 'hero should use a tuned gradient overlay')
assert.match(css, /\.hero-photo-tint[\s\S]*rgba\(7, 16, 13, 0\.42\)/, 'hero tint should be lighter so the field is visible')
assert.match(css, /\.hero-photo-gradient/, 'hero gradient should be defined in CSS')
assert.doesNotMatch(app, /bg-\[#07100d\]\/72/, 'hero should not use the old heavy flat overlay')

console.log('brand export polish checks passed')
