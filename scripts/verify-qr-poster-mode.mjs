import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.jsx', 'utf8')
const localization = readFileSync('src/utils/localization.js', 'utf8')
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))

assert.equal(Boolean(pkg.dependencies.qrcode), true, 'qrcode dependency should be installed')
assert.match(app, /import QRCode from 'qrcode'/)
assert.match(app, /const tournamentPublicUrl =/)
assert.match(app, /function buildPosterSvg/)
assert.match(app, /async function generateQrPosterImage/)
assert.match(app, /async function downloadQrPoster/)
assert.match(app, /function buildPrintablePosterHtml/)
assert.match(app, /function printQrPoster/)
assert.match(app, /function QrPosterPanel/)
assert.match(localization, /Scan to follow live matches, standings, scorers and results/)
assert.match(localization, /Download poster/)
assert.match(localization, /Print poster/)
assert.match(app, /QRCode\.toDataURL/)

function functionBody(name) {
  const start = app.indexOf(`function ${name}(`)
  assert.notEqual(start, -1, `${name} should exist`)

  const next = app.indexOf('\nfunction ', start + 1)
  return app.slice(start, next === -1 ? app.length : next)
}

const printableHtml = functionBody('buildPrintablePosterHtml')
const printPoster = functionBody('printQrPoster')
const qrPosterPanel = functionBody('QrPosterPanel')

assert.match(printableHtml, /<!doctype html>/, 'print window should receive a full HTML document')
assert.match(printableHtml, /@page\s*\{\s*size:\s*A4 portrait/, 'print HTML should define A4 portrait print CSS')
assert.match(printableHtml, /document\.fonts\.ready/, 'print HTML should wait for fonts before printing')
assert.match(printableHtml, /requestAnimationFrame/, 'print HTML should wait for render frames before printing')
assert.match(printableHtml, /window\.print\(\)/, 'print HTML should trigger browser print dialog after load')
assert.match(printableHtml, /app navbar|admin UI/i, 'print HTML should document that app chrome is excluded')

assert.match(printPoster, /window\.open\('', '_blank'\)/, 'print window should be opened only when printable HTML is ready')
assert.match(printPoster, /printWindow\.document\.open\(\)/, 'print code should explicitly open print document')
assert.match(printPoster, /printWindow\.document\.write\(printableHtml\)/, 'print code should write prepared HTML')
assert.match(printPoster, /printWindow\.document\.close\(\)/, 'print code should close document after writing')
assert.match(printPoster, /printWindow\.close\(\)/, 'print code should close failed blank windows')
assert.doesNotMatch(printPoster, /QRCode\.toDataURL/, 'print flow should not generate QR after opening the print window')
assert.doesNotMatch(printPoster, /noopener,noreferrer/, 'print flow should keep document access instead of opening an isolated blank tab')
assert.match(qrPosterPanel, /printQrPoster\(\{[\s\S]*posterSvg/, 'QR poster panel should pass the already-rendered poster SVG to print')

const adminStart = app.indexOf('function AdminBoard(')
const adminEnd = app.indexOf('function TeamManagementPanel(')
assert.notEqual(adminStart, -1, 'AdminBoard should exist')
assert.notEqual(adminEnd, -1, 'TeamManagementPanel should follow AdminBoard')
const adminBody = app.slice(adminStart, adminEnd)

assert.match(adminBody, /<QrPosterPanel/)
assert.match(adminBody, /adminUnlocked/)

console.log('qr-poster-mode checks passed')
