import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { getTeamFlag } from '../src/utils/teamFlags.js'

const expectedTeams = [
  { code: 'ALB', en: 'Albania', ar: 'ألبانيا', he: 'אלבניה', group: 'A' },
  { code: 'QAT', en: 'Qatar', ar: 'قطر', he: 'קטאר', group: 'A' },
  { code: 'MAR', en: 'Morocco', ar: 'المغرب', he: 'מרוקו', group: 'A' },
  { code: 'POR', en: 'Portugal', ar: 'البرتغال', he: 'פורטוגל', group: 'A' },
  { code: 'ALG', en: 'Algeria', ar: 'الجزائر', he: 'אלג׳יריה', group: 'B' },
  { code: 'EGY', en: 'Egypt', ar: 'مصر', he: 'מצרים', group: 'B' },
  { code: 'FRA', en: 'France', ar: 'فرنسا', he: 'צרפת', group: 'B' },
  { code: 'TUR', en: 'Turkey', ar: 'تركيا', he: 'טורקיה', group: 'B' },
]

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

for (const team of expectedTeams) {
  const flag = getTeamFlag(team.code)
  assert.ok(flag, `${team.code} should resolve to a flag`)
  assert.ok(flag.path, `${team.code} flag should have an asset path`)
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const { data, error } = await supabase
  .from('teams')
  .select('id,country,country_en,country_he,country_ar,code,group_code,sort_order')
  .order('sort_order', { ascending: true })

assert.ifError(error)
assert.equal(data.length, 8, 'database should contain exactly 8 tournament teams')

const teamsByCode = new Map(data.map((team) => [team.code, team]))

for (const expected of expectedTeams) {
  const team = teamsByCode.get(expected.code)

  assert.ok(team, `${expected.code} should exist`)
  assert.equal(team.country, expected.en, `${expected.code} country fallback should be English`)
  assert.equal(team.country_en, expected.en, `${expected.code} English name should match`)
  assert.equal(team.country_ar, expected.ar, `${expected.code} Arabic name should match`)
  assert.equal(team.country_he, expected.he, `${expected.code} Hebrew name should match`)
  assert.equal(team.group_code, expected.group, `${expected.code} group should match`)
}

const groupA = data.filter((team) => team.group_code === 'A').map((team) => team.code).sort()
const groupB = data.filter((team) => team.group_code === 'B').map((team) => team.code).sort()

assert.deepEqual(groupA, ['ALB', 'MAR', 'POR', 'QAT'], 'Group A team codes should match')
assert.deepEqual(groupB, ['ALG', 'EGY', 'FRA', 'TUR'], 'Group B team codes should match')

console.log('required team checks passed')
