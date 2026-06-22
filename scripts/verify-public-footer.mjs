import assert from 'node:assert/strict'
import fs from 'node:fs'

const app = fs.readFileSync('src/App.jsx', 'utf8')

assert.match(app, /Instagram/, 'Instagram icon should be imported')
assert.match(app, /function PublicFooter\(/, 'PublicFooter component should exist')
assert.match(app, /Developed by Mohammad Ragab/, 'Footer should include attribution text')
assert.match(app, /https:\/\/instagram\.com\/mohammaddaghash1212/, 'Footer should link to Instagram profile')
assert.match(app, /target="_blank"/, 'Footer link should open in a new tab')
assert.match(app, /rel="noreferrer"/, 'Footer link should avoid opener leakage')
assert.match(app, /aria-label="Developed by Mohammad Ragab"/, 'Footer link should include required aria label')
assert.match(app, /cursor-pointer/, 'Footer link should show clickable cursor')
assert.match(app, /hover:/, 'Footer link should include a hover effect')
assert.match(app, /activeView !== 'admin'[\s\S]*<PublicFooter \/>/, 'Footer should render on public pages only')

console.log('public footer checks passed')
