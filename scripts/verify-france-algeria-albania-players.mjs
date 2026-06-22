import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const expectedPlayers = {
  FRA: [
    ['Obaida Dhabre', 'عبيدة دحابرة', 'עוביידה דחאברה'],
    ['Mohammad Dhabre', 'محمد دحابرة', 'מוחמד דחאברה'],
    ['Ameer Taha', 'امير طه', 'אמיר טאהא'],
    ['Basel Khoury', 'باسل خوري', 'באסל חורי'],
    ['Yuhanna Mouallem', 'يوحنا معلم', 'יוחנא מועלם'],
    ['Boulos Mouallem', 'بولص معلم', 'בולוס מועלם'],
    ['Yazan Hajjo', 'يزن حجو', 'יזן חגו'],
    ['Ibraheem Mouallem', 'ابراهيم معلم', 'אבראהים מועלם'],
    ['Waseem Hannawe', 'وسيم حناوي', 'וסים חנאוי'],
  ],
  ALG: [
    ['Mohammad Hamood', 'محمد حمود', 'מוחמד חמוד'],
    ['Mohammad Khateeb', 'محمد خطيب', 'מוחמד חטיב'],
    ['Mohammad Hussien', 'محمد حسين', 'מוחמד חוסיין'],
    ['Ali Hussien', 'علي حسين', 'עלי חוסיין'],
    ['Yazan Hussien', 'يزن حسين', 'יזן חוסיין'],
    ['Firas Taha', 'فراس طه', 'פיראס טאהא'],
    ['Anas Khateeb', 'انس خطيب', 'אנס חטיב'],
    ['Waheed Salem', 'وحيد سالم', 'וחיד סאלם'],
    ['Mohammad Arshed', 'محمد ارشيد', 'מוחמד ארשיד'],
    ['Sabri Rabah', 'صبري رباح', 'סברי רבאח'],
  ],
  ALB: [
    ['Julian Hannawe', 'جوليان حناوي', 'גוליאן חנאוי'],
    ['Zain Ali', 'زين علي', 'זין עלי'],
    ['Marcus Ashkar', 'مرقص اشقر', 'מרקוס אשקר'],
    ['Kenan Khalaily', 'كنان خلايلة', 'קנאן חלאילה'],
    ['Ayham Hussien', 'أيهم حسين', 'אייהם חוסיין'],
    ['Khaled Hussien', 'خالد حسين', 'חאלד חוסיין'],
    ['Fouad Khoury', 'فؤاد خوري', 'פואד חורי'],
    ['Salah Dhabre', 'صلاح دحابرة', 'סלאח דחאברה'],
    ['Mohammad Ragab', 'محمد رجب', 'מוחמד רגב'],
    ['Shams Hussien', 'شمس حسين', 'שמס חוסיין'],
  ],
}

function readEnvFile(path) {
  const env = {}

  if (!existsSync(path)) {
    return env
  }

  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    let value = trimmed.slice(separatorIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    env[key] = value
  }

  return env
}

const env = {
  ...readEnvFile('.env'),
  ...readEnvFile('.env.local'),
  ...process.env,
}

assert.ok(env.VITE_SUPABASE_URL, 'VITE_SUPABASE_URL is required')
assert.ok(env.VITE_SUPABASE_ANON_KEY, 'VITE_SUPABASE_ANON_KEY is required')

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const teamCodes = Object.keys(expectedPlayers)
const { data: teams, error: teamError } = await supabase
  .from('teams')
  .select('id,code')
  .in('code', teamCodes)

assert.ifError(teamError)
assert.equal(teams.length, teamCodes.length, 'France, Algeria, and Albania teams should exist')

const teamByCode = new Map(teams.map((team) => [team.code, team]))
const { data: players, error: playerError } = await supabase
  .from('players')
  .select('id,team_id,name,name_en,name_ar,name_he,number,position')
  .in('team_id', teams.map((team) => team.id))
  .order('created_at', { ascending: true })

assert.ifError(playerError)

for (const [code, expectedTeamPlayers] of Object.entries(expectedPlayers)) {
  const team = teamByCode.get(code)
  assert.ok(team, `${code} team should exist`)

  const actualTeamPlayers = players.filter((player) => player.team_id === team.id)
  assert.equal(
    actualTeamPlayers.length,
    expectedTeamPlayers.length,
    `${code} should have exactly ${expectedTeamPlayers.length} players`,
  )

  for (const [englishName, arabicName, hebrewName] of expectedTeamPlayers) {
    const player = actualTeamPlayers.find((candidate) => candidate.name_en === englishName)
    assert.ok(player, `${code} player ${englishName} should exist`)
    assert.equal(player.name, englishName, `${englishName} fallback name should be English`)
    assert.equal(player.name_ar, arabicName, `${englishName} Arabic name should match`)
    assert.equal(player.name_he, hebrewName, `${englishName} Hebrew name should match`)
    assert.equal(player.number, null, `${englishName} should not require a number`)
    assert.equal(player.position, null, `${englishName} should not require a position`)
  }
}

console.log('France, Algeria, and Albania player checks passed')
