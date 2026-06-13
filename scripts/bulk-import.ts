/**
 * Bulk import: sweep league → seasons → player-stats.
 *
 * This is the efficient path to a complete graph. Instead of importing
 * player-by-player, we enumerate every player in every league season
 * via /leagues/{slug}/seasons/{season}/player-stats.
 *
 * Usage:
 *   # Import all pro leagues, all seasons
 *   npx tsx scripts/bulk-import.ts
 *
 *   # Specific leagues only
 *   npx tsx scripts/bulk-import.ts --leagues nhl,shl,khl,ahl
 *
 *   # Specific season range
 *   npx tsx scripts/bulk-import.ts --from 2015 --to 2024
 *
 *   # Dry run (count records, don't write)
 *   npx tsx scripts/bulk-import.ts --dry-run
 *
 * Requires EP_API_KEY.
 * Tip: set EP_RPS=0.5 to throttle to 30/min if you want to preserve quota.
 */

import 'dotenv/config'
import {
  requireKey, getLeagues, getLeagueSeasons, getLeagueSeasonPlayerStats,
  normalizeSeason, EPPlayerStat,
} from './ep-client'
import { upsertPlayer, upsertTeam, upsertStint, rebuildConnections, db } from './db-client'

// ── Args ──────────────────────────────────────────────────────────────────

const args  = process.argv.slice(2)
const flag  = (f: string) => args.includes(f)
const param = (f: string) => { const i = args.indexOf(f); return i !== -1 ? args[i + 1] : null }

const DRY_RUN      = flag('--dry-run')
const LEAGUE_FILTER = param('--leagues')?.split(',').map(s => s.trim().toLowerCase()) ?? null
const FROM_YEAR    = param('--from') ? parseInt(param('--from')!, 10) : null
const TO_YEAR      = param('--to')   ? parseInt(param('--to')!,   10) : null

// Leagues to target for a comprehensive professional graph.
// Covers NHL + top European leagues + AHL + major junior.
const PRO_LEAGUES = [
  // North America
  'nhl', 'ahl', 'echl', 'sphl', 'nhl-preseason',
  // Major junior
  'ohl', 'qmjhl', 'whl',
  // Europe — top
  'shl',    // Sweden
  'liiga',  // Finland
  'nla',    // Switzerland
  'del',    // Germany
  'khl',    // Russia/CIS
  'nl',     // Netherlands
  'czechia-extraliga',
  'slovakia-extraliga',
  'tipsport-liga',
  'hockeyallsvenskan',
  // NCAA & college
  'ncaa',
]

// ── Progress tracking ─────────────────────────────────────────────────────

let totalPlayers  = 0
let totalStints   = 0
let totalSkipped  = 0

function log(msg: string) { process.stdout.write(msg + '\n') }
function logInline(msg: string) { process.stdout.write('\r' + msg.padEnd(80)) }

// ── Core import logic ─────────────────────────────────────────────────────

async function importLeagueSeasonStats(
  leagueSlug: string,
  leagueName: string,
  season: string,   // EP format: "2018-2019"
): Promise<{ players: number; stints: number }> {
  let stats: EPPlayerStat[]
  try {
    stats = await getLeagueSeasonPlayerStats(leagueSlug, season)
  } catch (err) {
    log(`    ⚠ Skipped ${leagueName} ${season}: ${(err as Error).message}`)
    return { players: 0, stints: 0 }
  }

  if (stats.length === 0) return { players: 0, stints: 0 }
  if (DRY_RUN) {
    log(`    [dry] ${stats.length} player-stat records`)
    return { players: stats.length, stints: stats.length }
  }

  const seasonShort = normalizeSeason(season)
  const playersSeen = new Set<number>()

  for (const stat of stats) {
    logInline(`    ${stat.player?.firstName} ${stat.player?.lastName}...`)

    if (!stat.player?.id || !stat.team?.id) { totalSkipped++; continue }

    // Upsert league
    let leagueDbId: string | null = null
    if (stat.league?.slug) {
      const { data: lg } = await db.from('leagues')
        .upsert(
          { slug: stat.league.slug, name: stat.league.name ?? leagueName, ep_id: stat.league.id ?? null },
          { onConflict: 'slug' }
        )
        .select('id')
        .single()
      leagueDbId = lg?.id ?? null
    }

    // Upsert player
    const p = stat.player
    const name = p.name ?? `${p.firstName} ${p.lastName}`
    const dbPlayer = await upsertPlayer({
      ep_id:       p.id,
      name,
      position:    p.position ?? null,
      nationality: p.country?.name ?? null,
      birthdate:   p.dateOfBirth ?? null,
      image_url:   p.imageUrl ?? null,
    })
    if (!playersSeen.has(p.id)) { playersSeen.add(p.id); totalPlayers++ }

    // Upsert team
    const dbTeam = await upsertTeam({
      ep_id:   stat.team.id,
      name:    stat.team.name,
      league:  stat.league?.name ?? null,
      country: stat.team.country?.name ?? null,
    })

    // Upsert stint
    const regular = stat.regular as Record<string, number> | undefined
    await db.from('stints').upsert(
      {
        player_id: dbPlayer.id,
        team_id:   dbTeam.id,
        league_id: leagueDbId,
        season:    seasonShort,
        games:     regular?.gp   ?? null,
        goals:     regular?.g    ?? null,
        assists:   regular?.a    ?? null,
        points:    regular?.tp   ?? null,
      },
      { onConflict: 'player_id,team_id,season' }
    )
    totalStints++
  }

  process.stdout.write('\n')
  return { players: playersSeen.size, stints: stats.length }
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  requireKey()

  log('\n━━━ Linemates Bulk Import ━━━')
  if (DRY_RUN) log('DRY RUN — no writes')
  if (LEAGUE_FILTER) log(`League filter: ${LEAGUE_FILTER.join(', ')}`)
  if (FROM_YEAR)  log(`From season starting: ${FROM_YEAR}`)
  if (TO_YEAR)    log(`To season starting:   ${TO_YEAR}`)
  log('')

  // Step 1: get all leagues
  log('Fetching league list...')
  const allLeagues = await getLeagues()
  const targetSlugs = LEAGUE_FILTER ?? PRO_LEAGUES
  const leagues = allLeagues.filter(l => targetSlugs.includes(l.slug.toLowerCase()))

  log(`Found ${leagues.length} matching leagues (of ${allLeagues.length} total)\n`)

  const startTime = Date.now()

  for (const league of leagues) {
    log(`\n▶ ${league.name} (${league.slug})`)

    // Step 2: get all seasons for this league
    let seasons
    try {
      seasons = await getLeagueSeasons(league.slug)
    } catch {
      log('  ⚠ Could not fetch seasons — skipping')
      continue
    }

    // Filter by year range
    const filtered = seasons.filter(s => {
      if (FROM_YEAR && s.startYear < FROM_YEAR) return false
      if (TO_YEAR   && s.startYear > TO_YEAR)   return false
      return true
    }).sort((a, b) => b.startYear - a.startYear)  // newest first

    log(`  ${filtered.length} seasons to import`)

    for (const season of filtered) {
      log(`  Season ${season.slug}`)
      const { players, stints } = await importLeagueSeasonStats(
        league.slug,
        league.name,
        season.slug,
      )
      log(`    → ${players} players, ${stints} stints`)
    }
  }

  // Step 3: rebuild connection graph
  if (!DRY_RUN) {
    log('\nRebuilding connection graph...')
    await rebuildConnections()
    log('✓ Graph rebuilt')
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000)
  log(`\n━━━ Done in ${elapsed}s ━━━`)
  log(`Players upserted : ${totalPlayers}`)
  log(`Stints upserted  : ${totalStints}`)
  log(`Records skipped  : ${totalSkipped}`)
}

main().catch(err => { console.error(err); process.exit(1) })
