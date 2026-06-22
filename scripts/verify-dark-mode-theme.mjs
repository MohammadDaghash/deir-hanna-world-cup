import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.jsx', 'utf8')
const css = readFileSync('src/App.css', 'utf8')
const localization = readFileSync('src/utils/localization.js', 'utf8')

assert.match(app, /const themeStorageKey = 'deir-hanna-world-cup-theme'/, 'theme preference should use stable localStorage key')
assert.match(app, /const themeOptions = \[/, 'theme options should be centrally defined')
assert.match(app, /id: 'light'/, 'light theme option should exist')
assert.match(app, /id: 'dark'/, 'dark theme option should exist')
assert.doesNotMatch(app, /id: 'system'/, 'system theme option should be removed from the toggle')
assert.doesNotMatch(app, /Monitor/, 'system theme icon should not be imported or rendered')
assert.doesNotMatch(app, /function getSystemThemePreference\(/, 'system theme fallback should be removed')
assert.doesNotMatch(app, /prefers-color-scheme: dark/, 'theme should not listen to system preference anymore')
assert.match(app, /function getStoredThemePreference\(/, 'stored theme preference loader should exist')
assert.match(app, /function storeThemePreference\(/, 'theme preference saver should exist')
assert.match(app, /document\.documentElement\.dataset\.theme = resolvedTheme/, 'resolved theme should be applied to document root')
assert.match(app, /document\.documentElement\.style\.colorScheme = resolvedTheme/, 'browser controls should receive color-scheme')
assert.match(app, /const \[themePreference, setThemePreference\] = useState/, 'App should keep saved theme preference state')
assert.match(app, /const resolvedTheme = themePreference/, 'App should derive resolved theme directly from the saved light/dark preference')
assert.match(app, /<ThemeSelector[\s\S]*themePreference=\{themePreference\}[\s\S]*resolvedTheme=\{resolvedTheme\}/, 'Header should render theme selector with active state')
assert.match(app, /function ThemeSelector\(/, 'Theme selector component should exist')
assert.match(app, /theme-toggle-label/, 'Theme buttons should include clear visible labels')
assert.match(app, /className=\{`app-shell theme-\$\{resolvedTheme\}/, 'root app shell should include theme class')
assert.match(app, /data-theme=\{resolvedTheme\}/, 'root app shell should expose data-theme')

for (const key of ['theme', 'appearance', 'lightMode', 'darkMode']) {
  assert.match(localization, new RegExp(`${key}:`), `${key} translation should exist`)
}
assert.doesNotMatch(localization, /systemTheme:/, 'system theme translations should be removed when the option is removed')

assert.match(css, /\.theme-toggle/, 'theme selector should have polished CSS')
assert.match(css, /\.theme-toggle-label/, 'theme selector should style visible light/dark labels')
assert.match(css, /html\[data-theme='dark'\]/, 'dark theme should apply from document root')
assert.match(css, /\.theme-dark/, 'dark theme should apply from app shell')
assert.match(css, /\[class\*="bg-\[\#f6f7f2\]"\]/, 'page background utility should be remapped in dark mode')
assert.match(css, /\[class~="bg-white"\]/, 'white card utilities should be remapped in dark mode')
assert.match(css, /\[class\*="text-\[\#14201b\]"\]/, 'primary text utility should be remapped in dark mode')
assert.match(css, /html\[data-theme='dark'\][\s\S]*input/, 'dark mode should style form controls')
assert.match(css, /\.theme-dark \.hero-photo-tint/, 'dark mode should tune hero overlay')

console.log('dark mode theme checks passed')
