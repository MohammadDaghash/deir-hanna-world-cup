import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.jsx', 'utf8')
const css = readFileSync('src/App.css', 'utf8')
const indexCss = readFileSync('src/index.css', 'utf8')

const headerShellBlock = css.match(/\.tournament-header-shell\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
const stickyHeaderClass = app.match(/<header className="([^"]+)"/)?.[1] ?? ''

assert.ok(
  app.includes('const nextCollapsed = currentScrollY > lastScrollY && currentScrollY > 72'),
  'scroll handler should derive collapsed state with a stable threshold',
)
assert.ok(
  app.includes('setHeaderCollapsed((previous) => (previous === nextCollapsed ? previous : nextCollapsed))'),
  'scroll handler should avoid redundant React state updates',
)
assert.ok(
  !stickyHeaderClass.includes('backdrop-blur'),
  'sticky top header should not use backdrop-blur on the hot scroll path',
)
assert.ok(
  !/transition:\s*[\s\S]*(gap|padding|max-height)/.test(headerShellBlock),
  'header shell should not animate layout properties',
)
assert.ok(
  css.includes('.motion-card'),
  'shared card motion class should exist',
)
assert.ok(
  css.includes('.tap-target'),
  'shared tap feedback class should exist',
)
assert.ok(
  css.includes('content-visibility: auto'),
  'long public sections should use content-visibility where safe',
)
assert.ok(
  css.includes('@media (hover: none)'),
  'mobile touch devices should not depend on hover effects',
)
assert.ok(
  css.includes('@supports (-webkit-touch-callout: none)'),
  'iOS Safari-specific paint reductions should be present',
)
assert.ok(
  css.includes('prefers-reduced-motion: reduce'),
  'motion must respect reduced-motion preference',
)
assert.ok(
  /html\s*\{[\s\S]*overflow-x:\s*hidden/.test(indexCss),
  'html should prevent page-wide horizontal overflow',
)
assert.ok(
  /body\s*\{[\s\S]*overflow-x:\s*hidden/.test(indexCss),
  'body should prevent page-wide horizontal overflow',
)
assert.ok(
  /#root\s*\{[\s\S]*overflow-x:\s*clip/.test(indexCss),
  '#root should clip accidental horizontal overflow',
)

console.log('mobile smoothness checks passed')
