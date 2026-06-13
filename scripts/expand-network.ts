/**
 * Expand the network outward from a seed player.
 *
 * Given a player already in the DB, fetches the full roster for every team
 * they played on — pulling in all their direct teammates (degree 1).
 * Optionally go to degree 2 by expanding each of those teammates too.
 *
 * Usage:
 *   npx tsx scripts/expand-network.ts <player_db_id> [--depth 2]
 *
 * Requires EP_API_KEY (team rosters are a commercial endpoint).
 */

import 'dotenv/config'
import { getTeamRoster, getPlayerCareer } from './ep-client'
import { upsertPlayer, upsertTeam, upsertStint, rebuildConnections, db } from './db-client'

function normalizeSeason(slug: string): string {
  const match = slug.match(/^(\d{4})-(\d{4})$/)
  if (!match) return slug
  return `${match[1]}-${match[2].slice(2)}`
}

function expandSeason(short: string): string {
  const match = short.match(/^(\d{4})-(\d{2})$/)
  if (!match) return short
  const start = parseInt(match[1], 10)
  return `${start}-${start + 1}`
}

async function importPlayerCareer(epId: number): Promise<string | null> {
  try {
    const { getPlayer } = await import('./ep-client')
    const p = await getPlayer(epId)
    const fullName = `${p.firstName} ${p.lastName}`
    const dbPlayer = await upsertPlayer({
      ep_id:       p.id,
      name:        fullName,
      position:    p.position ?? null,
      nationality: p.country?.name ?? null,
      birthdate:   p.dateOfBirth ?? null,
      image_url:   p.imageUrl ?? null,
    })
    const career = await getPlayerCareer(epId)
    for (const stat of career) {
      if (!stat.team?.id) continue
      const dbTeam = await upsertTeam({ ep_id: stat.team.id, name: stat.team.name, league: stat.team.league?.name ?? null, country: stat.team.country?.name ?? null })
      await upsertStint({ player_id: dbPlayer.id, team_id: dbTeam.id, season: normalizeSeason(stat.season.slug), games: stat.regular?.gp ?? null, goals: stat.regular?.g ?? null, assists: stat.regular?.a ?? null, points: stat.regular?.tp ?? null })
    }
    return dbPlayer.id
  } catch (err) {
    console.warn(`  ⚠ Could not import EP ${epId}: ${(err as Error).message}`)
    return null
  }
}

async function expandFromPlayer(dbPlayerId: string, depth: number) {
  // Get all their stints from the DB
  const { data: stints } = await db
    .from('stints')
    .select('team_id, season, teams(ep_id, name)')
    .eq('player_id', dbPlayerId)

  if (!stints?.length) {
    console.log('No stints found for this player. Import their career first.')
    return
  }

  const processed = new Set<string>()

  for (const stint of stints) {
    const team = (stint.teams as unknown) as { ep_id: number | null; name: string } | null
    if (!team?.ep_id) continue

    const key = `${team.ep_id}:${stint.season}`
    if (processed.has(key)) continue
    processed.add(key)

    console.log(`\nExpanding roster: ${team.name} (${stint.season})...`)
    try {
      const roster = await getTeamRoster(team.ep_id, expandSeason(stint.season))
      console.log(`  ${roster.length} players on roster`)

      for (const entry of roster) {
        if (!entry.player?.id) continue
        process.stdout.write(`  → ${entry.player.firstName} ${entry.player.lastName}`)
        const id = await importPlayerCareer(entry.player.id)
        console.log(id ? ' ✓' : ' ✗')

        // Degree 2: recurse into each teammate's career (expensive — use sparingly)
        if (depth >= 2 && id) {
          await expandFromPlayer(id, 1)
        }
      }
    } catch (err) {
      console.warn(`  ⚠ Roster fetch failed: ${(err as Error).message}`)
    }
  }
}

async function main() {
  const args = process.argv.slice(2)
  const dbPlayerId = args[0]
  const depthFlag  = args.indexOf('--depth')
  const depth      = depthFlag !== -1 ? parseInt(args[depthFlag + 1], 10) : 1

  if (!dbPlayerId) {
    console.error('Usage: npx tsx scripts/expand-network.ts <player_db_id> [--depth 2]')
    process.exit(1)
  }

  const { data: player } = await db.from('players').select('name').eq('id', dbPlayerId).single()
  console.log(`\nExpanding network from: ${player?.name ?? dbPlayerId} (depth=${depth})`)

  await expandFromPlayer(dbPlayerId, depth)

  console.log('\nRebuilding connection graph...')
  await rebuildConnections()
  console.log('✓ Done')
}

main().catch(err => { console.error(err); process.exit(1) })
