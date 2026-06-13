/**
 * Import a player's full career into the DB, then rebuild connection edges.
 *
 * Usage:
 *   npx tsx scripts/import-player.ts <ep_player_id>
 *   npx tsx scripts/import-player.ts --name "Jeff Wilson"
 *
 * Requires EP_API_KEY in .env.local for career stats.
 * Player search works without a key.
 */

import 'dotenv/config'
import { search, getPlayer, getPlayerStats, normalizeSeason } from './ep-client'
import { upsertPlayer, upsertTeam, upsertStint, rebuildConnections, db } from './db-client'

async function importPlayer(epId: number) {
  console.log(`\nImporting EP player ${epId}...`)

  const player = await getPlayer(epId)
  const fullName = `${player.firstName} ${player.lastName}`

  const dbPlayer = await upsertPlayer({
    ep_id:       player.id,
    name:        fullName,
    position:    player.position ?? null,
    nationality: player.country?.name ?? null,
    birthdate:   player.dateOfBirth ?? null,
    image_url:   player.imageUrl ?? null,
  })
  console.log(`  ✓ Player: ${dbPlayer.name} (${dbPlayer.id})`)

  const career = await getPlayerStats(epId)
  console.log(`  Found ${career.length} career stints`)

  for (const stat of career) {
    const epTeamId = stat.team?.id
    if (!epTeamId) continue

    const dbTeam = await upsertTeam({
      ep_id:   epTeamId,
      name:    stat.team.name,
      league:  stat.league?.name ?? null,
      country: stat.team.country?.name ?? null,
    })

    const seasonNorm = normalizeSeason(stat.season.slug)
    const regular = stat.regular as Record<string, number> | undefined

    await upsertStint({
      player_id: dbPlayer.id,
      team_id:   dbTeam.id,
      season:    seasonNorm,
      games:     regular?.gp ?? null,
      goals:     regular?.g  ?? null,
      assists:   regular?.a  ?? null,
      points:    regular?.tp ?? null,
    })

    console.log(`    → ${stat.team.name} (${seasonNorm})`)
  }

  return dbPlayer
}

async function main() {
  const args = process.argv.slice(2)

  let epId: number | null = null

  const nameFlag = args.indexOf('--name')
  if (nameFlag !== -1) {
    const query = args[nameFlag + 1]
    if (!query) { console.error('--name requires a value'); process.exit(1) }

    console.log(`Searching EP for "${query}"...`)
    const { players } = await search(query)
    if (players.length === 0) { console.error('No players found'); process.exit(1) }

    console.log('\nMatches:')
    players.slice(0, 5).forEach((p, i) =>
      console.log(`  [${i}] ${p.firstName} ${p.lastName} (EP ID: ${p.id}) — ${p.position ?? 'unknown position'}`)
    )

    const pick = players[0]
    console.log(`\nAuto-selecting: ${pick.firstName} ${pick.lastName} (${pick.id})`)
    epId = pick.id

  } else if (args[0]) {
    epId = parseInt(args[0], 10)
    if (isNaN(epId)) { console.error('Invalid EP player ID'); process.exit(1) }
  } else {
    console.error('Usage: npx tsx scripts/import-player.ts <ep_id>\n       npx tsx scripts/import-player.ts --name "Player Name"')
    process.exit(1)
  }

  const player = await importPlayer(epId)

  console.log('\nRebuilding connection graph...')
  await rebuildConnections()
  console.log('✓ Done\n')

  // Print a summary
  const { data: stints } = await db
    .from('stints')
    .select('season, teams(name, league)')
    .eq('player_id', player.id)
    .order('season', { ascending: false })

  console.log(`Career for ${player.name}:`)
  stints?.forEach(s => {
    const team = (s.teams as unknown) as { name: string; league: string | null } | null
    console.log(`  ${s.season}  ${team?.name ?? '?'}  (${team?.league ?? '?'})`)
  })
}

main().catch(err => { console.error(err); process.exit(1) })
