import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const tables = [
  'teams',
  'players',
  'matches',
  'match_events',
  'match_votes',
  'lineups',
  'lineup_players',
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

if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required for backup.')
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const backup = {
  createdAt: new Date().toISOString(),
  projectUrl: env.VITE_SUPABASE_URL,
  tables: {},
}

for (const table of tables) {
  const { data, error } = await supabase.from(table).select('*')

  if (error) {
    throw new Error(`Could not back up ${table}: ${error.message}`)
  }

  backup.tables[table] = data
}

const timestamp = backup.createdAt.replaceAll(':', '-').replaceAll('.', '-')
const outputPath = join('backups', `production-data-${timestamp}.json`)
mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(backup, null, 2)}\n`)

console.log(`Backup written to ${outputPath}`)
for (const table of tables) {
  console.log(`${table}: ${backup.tables[table].length}`)
}
