/**
 * Import player career data from a Hockey Reference CSV export.
 *
 * How to get the CSV:
 *   1. Go to hockey-reference.com → search for a player
 *   2. On their stats page, scroll to "Regular Season" table
 *   3. Click "Share & Export" → "Get table as CSV"
 *   4. Paste into a .csv file, save to scripts/data/
 *
 * Usage:
 *   npx tsx scripts/import-csv.ts scripts/data/jeff-wilson.csv "Jeff Wilson"
 *
 * No API key required.
 */

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { upsertPlayer, upsertTeam, upsertStint, rebuildConnections } from './db-client'

interface HockeyRefRow {
  Season:   string
  Tm:       string
  Lg:       string
  GP?:      string
  G?:       string
  A?:       string
  PTS?:     string
  [key: string]: string | undefined
}

function parseCSV(content: string): HockeyRefRow[] {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim())
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.replace(/^"|"$/g, '').trim())
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ''])) as HockeyRefRow
  })
}

// Hockey Reference uses formats like "2018-19" — matches our DB format
function cleanSeason(s: string): string {
  return s.replace(/\s+/g, '').trim()
}

async function main() {
  const [csvPath, playerName] = process.argv.slice(2)
  if (!csvPath || !playerName) {
    console.error('Usage: npx tsx scripts/import-csv.ts <path-to-csv> "Player Name"')
    process.exit(1)
  }

  const absPath = path.resolve(csvPath)
  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${absPath}`)
    process.exit(1)
  }

  const content = fs.readFileSync(absPath, 'utf-8')
  const rows    = parseCSV(content)

  // Filter out totals rows (Hockey Reference adds "TOT" team for traded seasons)
  const stints = rows.filter(r => r.Season && r.Tm && r.Tm !== 'TOT' && r.Lg)

  console.log(`\nImporting ${playerName} from CSV (${stints.length} stints)...`)

  const dbPlayer = await upsertPlayer({
    ep_id:       null as unknown as number, // no EP ID from CSV
    name:        playerName,
    position:    null,
    nationality: null,
    birthdate:   null,
    image_url:   null,
  })
  console.log(`  ✓ Player: ${dbPlayer.name} (${dbPlayer.id})`)

  for (const row of stints) {
    const season = cleanSeason(row.Season)
    const dbTeam = await upsertTeam({
      ep_id:   null as unknown as number,
      name:    row.Tm,
      league:  row.Lg ?? null,
      country: null,
    })

    await upsertStint({
      player_id: dbPlayer.id,
      team_id:   dbTeam.id,
      season,
      games:   row.GP  ? parseInt(row.GP,  10) : null,
      goals:   row.G   ? parseInt(row.G,   10) : null,
      assists: row.A   ? parseInt(row.A,   10) : null,
      points:  row.PTS ? parseInt(row.PTS, 10) : null,
    })
    console.log(`    → ${row.Tm} (${season})`)
  }

  console.log('\nRebuilding connection graph...')
  await rebuildConnections()
  console.log('✓ Done')
}

main().catch(err => { console.error(err); process.exit(1) })
