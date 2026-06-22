import assert from 'node:assert/strict'
import fs from 'node:fs'

const app = fs.readFileSync('src/App.jsx', 'utf8')
const appCss = fs.readFileSync('src/App.css', 'utf8')
const html = fs.readFileSync('index.html', 'utf8')

const logoPath = 'public/brand/el-capitano-logo.jpg'
const iconPath = 'public/brand/el-capitano-icon.png'
const coverPath = 'public/brand/el-capitano-playground.jpg'

for (const path of [logoPath, iconPath, coverPath]) {
  assert.ok(fs.existsSync(path), `${path} should exist`)
  assert.ok(fs.statSync(path).size > 1024, `${path} should not be empty`)
}

assert.match(html, /href="\/brand\/el-capitano-icon\.png"/, 'favicon should use El Capitano icon')
assert.match(app, /brandLogoPath\s*=\s*'\/brand\/el-capitano-logo\.jpg'/, 'App should define local logo asset path')
assert.match(app, /brandCoverPath\s*=\s*'\/brand\/el-capitano-playground\.jpg'/, 'App should define local playground cover path')
assert.match(app, /function BrandLogo\(/, 'App should expose a reusable BrandLogo component')
assert.match(app, /function Header[\s\S]*<BrandLogo/, 'Top header should render the El Capitano logo')
assert.match(app, /function TournamentHeader[\s\S]*className="hero-cover-image"/, 'Hero should render the playground cover image')
assert.match(app, /function TournamentHeader[\s\S]*<BrandLogo/, 'Hero should render the El Capitano logo')
assert.match(app, /buildMatchShareCardSvg[\s\S]*brandLogoPath/, 'Share/story card SVG should include the El Capitano logo')
assert.match(app, /buildPosterSvg[\s\S]*brandLogoPath/, 'QR poster SVG should include the El Capitano logo')
assert.match(appCss, /\.hero-cover-image/, 'Hero cover image should have dedicated CSS')
assert.match(appCss, /\.brand-logo-image/, 'Brand logo should have dedicated CSS')

console.log('branding asset checks passed')
