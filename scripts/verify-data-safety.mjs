import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const scanTargets = [
  'supabase/schema.sql',
  'supabase/seed.generated.sql',
  'scripts/generate-supabase-seed.mjs',
  ...listFiles('supabase/migrations').filter((file) => file.endsWith('.sql')),
]

const destructivePatterns = [
  /\bdelete\s+from\s+public\.(teams|players|matches|match_events|match_votes|admin_users)\b/i,
  /\bdelete\s+from\s+public\.(lineups|lineup_players|player_match_stats)\b/i,
  /\btruncate\s+(table\s+)?(public\.)?(teams|players|matches|match_events|match_votes|admin_users|lineups|lineup_players|player_match_stats)\b/i,
  /\bdrop\s+table\s+(if\s+exists\s+)?(public\.)?(teams|players|matches|match_events|match_votes|admin_users|lineups|lineup_players|player_match_stats)\b/i,
  /\breset\s+(demo|data|database|tournament)\b/i,
]

const violations = []

for (const target of scanTargets) {
  const source = stripSqlComments(readFileSync(target, 'utf8'))

  for (const pattern of destructivePatterns) {
    const match = source.match(pattern)
    if (match) {
      violations.push(`${target}: ${match[0].replace(/\s+/g, ' ')}`)
    }
  }
}

assert.equal(
  violations.length,
  0,
  `destructive production data operations are not allowed:\n${violations.join('\n')}`,
)

console.log('data safety checks passed')

function listFiles(directory) {
  if (!existsSync(directory)) {
    return []
  }

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) {
      return listFiles(path)
    }

    return path
  })
}

function stripSqlComments(source) {
  return source
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
}
