/**
 * Import every player on a team's roster for a given season.
 * This is the "expand outward" step — once you've imported yourself,
 * run this for each team you played on to pull in all your teammates.
 *
 * Usage:
 *   npx tsx scripts/import-team-season.ts <ep_team_id> <season>
 *   npx tsx scripts/import-team-season.ts 455 2018-19
 *
 * Requires EP_API_KEY.
 */

import 'dotenv/config'
import { getTeamPlayers, getPlayerStats, normalizeSeason, expandSeason } from './ep-client'
import { upsertPlayer, upsertTeam, upsertStint, rebuildConnections } from './db-client'

async function main() {
  const [epTeamIdStr, seasonArg] = process.argv.slice(2)
  if (!epTeamIdStr || !seasonArg) {
    console.error('Usage: npx tsx scripts/import-team-season.ts <ep_team_id> <season>\nExample: npx tsx scripts/import-team-season.ts 455 2018-19')
    process.exit(1)
  }

  const epTeamId    = parseInt(epTeamIdStr, 10)
  const seasonShort = seasonArg
  const seasonLong  = expandSeason(seasonShort)

  console.log(`\nFetching roster: team ${epTeamId}, season ${seasonShort}...`)
  const players = await getTeamPlayers(epTeamId)
  console.log(`  Found ${players.length} players on roster\n`)

  for (const p of players) {
    if (!p?.id) continue

    const fullName = `${p.firstName} ${p.lastName}`
    console.log(`Importing ${fullName} (EP ${p.id})...`)

    const dbPlayer = await upsertPlayer({
      ep_id:       p.id,
      name:        fullName,
      position:    p.position ?? null,
      nationality: p.country?.name ?? null,
      birthdate:   p.dateOfBirth ?? null,
      image_url:   p.imageUrl ?? null,
    })

    try {
      const career = await getPlayerStats(p.id)
      for (const stat of career) {
        if (!stat.team?.id) continue
        const dbTeam = await upsertTeam({
          ep_id:   stat.team.id,
          name:    stat.team.name,
          league:  stat.league?.name ?? null,
          country: stat.team.country?.name ?? null,
        })
        const regular = stat.regular as Record<string, number> | undefined
        await upsertStint({
          player_id: dbPlayer.id,
          team_id:   dbTeam.id,
          season:    normalizeSeason(stat.season.slug),
          games:     regular?.gp ?? null,
          goals:     regular?.g  ?? null,
          assists:   regular?.a  ?? null,
          points:    regular?.tp ?? null,
        })
      }
      console.log(`  ✓ ${career.length} stints`)
    } catch (err) {
      console.warn(`  ⚠ Could not fetch career for ${fullName}: ${(err as Error).message}`)
      const dbTeam = await upsertTeam({ ep_id: epTeamId, name: `Team ${epTeamId}`, league: null, country: null })
      await upsertStint({ player_id: dbPlayer.id, team_id: dbTeam.id, season: seasonShort })
    }
  }
  void seasonLong

  console.log('\nRebuilding connection graph...')
  await rebuildConnections()
  console.log('✓ Done\n')
}

main().catch(err => { console.error(err); process.exit(1) })
