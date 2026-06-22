import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.jsx', 'utf8')
const css = readFileSync('src/App.css', 'utf8')

assert.match(app, /const \[headerCollapsed, setHeaderCollapsed\] = useState\(false\)/)
assert.match(app, /let lastScrollY = window\.scrollY/)
assert.match(app, /window\.requestAnimationFrame\(updateHeader\)/)
assert.match(app, /window\.addEventListener\('scroll', handleScroll, \{ passive: true \}\)/)
assert.match(app, /isCollapsed=\{headerCollapsed\}/)
assert.match(
  app,
  /function Header\(\{ activeView, isCollapsed, language, onLanguageChange, onViewSelect \}\)/,
)
assert.match(app, /aria-label="Main views"/)
assert.match(app, /tournament-header-brand/)
assert.match(app, /tournament-header-language/)

assert.match(css, /\.tournament-header-brand/)
assert.match(css, /\.tournament-header-brand-collapsed/)
assert.match(css, /\.tournament-header-language-collapsed/)
assert.match(css, /prefers-reduced-motion: reduce/)

console.log('scroll-header checks passed')
