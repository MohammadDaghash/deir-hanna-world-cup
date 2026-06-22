import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../src/App.css', import.meta.url), 'utf8')

assert.match(app, /data-active-view=\{/, 'app shell should expose active view for page-level transitions')
assert.match(app, /className=\{`page-transition-shell/, 'main content should use the page transition shell')
assert.match(app, /className=\{`status-pill /, 'status labels should use shared motion-aware status-pill styling')
assert.match(app, /className="score-value/, 'score values should use a shared score micro-animation class')
assert.match(app, /live-pulse-dot/, 'live UI should use a dedicated pulse dot class')

assert.match(css, /\.app-shell::before/, 'app shell should include a subtle premium background layer')
assert.match(css, /\.page-transition-shell/, 'page transition shell CSS should exist')
assert.match(css, /\.motion-card/, 'motion card reveal CSS should exist')
assert.match(css, /\.premium-card/, 'premium card surface CSS should exist')
assert.match(css, /\.status-pill-live/, 'live status pill CSS should exist')
assert.match(css, /\.score-value/, 'score micro-animation CSS should exist')
assert.match(css, /@keyframes section-rise/, 'page/card entrance keyframes should exist')
assert.match(css, /@keyframes live-pulse/, 'live pulse keyframes should exist')
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/, 'reduced-motion support should remain in CSS')
assert.match(css, /@supports \(-webkit-touch-callout: none\)/, 'iPhone Safari performance overrides should remain in CSS')
assert.doesNotMatch(css, /backdrop-filter:[^;]+blur\((?:[1-9]\d|[8-9])px\)/, 'avoid heavy blur effects that hurt iPhone Safari scrolling')

console.log('premium motion UI checks passed')
