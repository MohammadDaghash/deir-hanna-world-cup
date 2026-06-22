import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const expectedPlayers = {
  POR: [
    ['Bahaa Daghash', 'بهاء دغش', 'בהאא דגש'],
    ['Azme Salem', 'عزمي سالم', 'עזמי סאלם'],
    ['Ahmad Khateeb', 'احمد خطيب', 'אחמד חטיב'],
    ['Samer Hamood', 'سامر حمود', 'סאמר חמוד'],
    ['Mefleh Azzam', 'مفلح عزام', 'מפלח עזאם'],
    ['Ahmad Dhabre', 'احمد دحابره', 'אחמד דחאברה'],
    ['Basel Khalifa', 'باسل خليفه', 'באסל חליפה'],
    ['Razi Abu Alhof', 'رازي ابو الحوف', 'ראזי אבו אלחוף'],
    ['Rayan Daghash', 'ريان دغش', 'ריאן דגש'],
    ['Mohammad Azme Salem', 'محمد عزمي سالم', 'מוחמד עזמי סאלם'],
  ],
  EGY: [
    ['Mohammad Dokhe', 'محمد دوخي', 'מוחמד דוחי'],
    ['Wael Mresat', 'وائل مريسات', 'ואאיל מריסאת'],
    ['Mohammad El Eyad', 'محمد الإياد', 'מוחמד אל איאד'],
    ['Hady Abbas', 'هادي عباس', 'האדי עבאס'],
    ['Naseem Daghash', 'نسيم دغش', 'נסים דגש'],
    ['Wesam Khateeb', 'وسام خطيب', 'וסאם חטיב'],
    ['Khaleel Khateeb', 'خليل خطيب', 'חליל חטיב'],
    ['7abshoosh', 'حبشوش', 'חבשוש'],
    ['Ward Salem', 'ورد سالم', 'ורד סאלם'],
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
const { data: teams, error: teamError } = await supabase
  .from('teams')
  .select('id,code')
  .in('code', Object.keys(expectedPlayers))

assert.ifError(teamError)
assert.equal(teams.length, 2, 'Portugal and Egypt teams should exist')

const teamByCode = new Map(teams.map((team) => [team.code, team]))
const teamIds = teams.map((team) => team.id)

const { data: players, error: playerError } = await supabase
  .from('players')
  .select('id,team_id,name,name_en,name_ar,name_he,number,position')
  .in('team_id', teamIds)
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

console.log('Portugal and Egypt player checks passed')
