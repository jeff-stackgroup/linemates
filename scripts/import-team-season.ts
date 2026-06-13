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
import { getTeamRoster, getPlayerCareer } from './ep-client'
import { upsertPlayer, upsertTeam, upsertStint, rebuildConnections } from './db-client'

function normalizeSeason(slug: string): string {
  const match = slug.match(/^(\d{4})-(\d{4})$/)
  if (!match) return slug
  return `${match[1]}-${match[2].slice(2)}`
}

// EP expects "2018-2019" format
function expandSeason(short: string): string {
  const match = short.match(/^(\d{4})-(\d{2})$/)
  if (!match) return short
  const start = parseInt(match[1], 10)
  return `${start}-${start + 1}`
}

async function main() {
  const [epTeamIdStr, seasonArg] = process.argv.slice(2)
  if (!epTeamIdStr || !seasonArg) {
    console.error('Usage: npx tsx scripts/import-team-season.ts <ep_team_id> <season>\nExample: npx tsx scripts/import-team-season.ts 455 2018-19')
    process.exit(1)
  }

  const epTeamId = parseInt(epTeamIdStr, 10)
  const seasonShort = seasonArg       // "2018-19"
  const seasonLong  = expandSeason(seasonShort) // "2018-2019"

  console.log(`\nFetching roster: team ${epTeamId}, season ${seasonShort}...`)
  const roster = await getTeamRoster(epTeamId, seasonLong)
  console.log(`  Found ${roster.length} players on roster\n`)

  for (const entry of roster) {
    const p = entry.player
    if (!p?.id) continue

    const fullName = `${p.firstName} ${p.lastName}`
    console.log(`Importing ${fullName} (EP ${p.id})...`)

    const dbPlayer = await upsertPlayer({
      ep_id:       p.id,
      name:        fullName,
      position:    p.position ?? entry.position ?? null,
      nationality: p.country?.name ?? null,
      birthdate:   p.dateOfBirth ?? null,
      image_url:   p.imageUrl ?? null,
    })

    // Fetch full career for each player (so we get all their connections, not just this team)
    try {
      const career = await getPlayerCareer(p.id)
      for (const stat of career) {
        if (!stat.team?.id) continue
        const dbTeam = await upsertTeam({
          ep_id:   stat.team.id,
          name:    stat.team.name,
          league:  stat.team.league?.name ?? null,
          country: stat.team.country?.name ?? null,
        })
        await upsertStint({
          player_id: dbPlayer.id,
          team_id:   dbTeam.id,
          season:    normalizeSeason(stat.season.slug),
          games:     stat.regular?.gp ?? null,
          goals:     stat.regular?.g  ?? null,
          assists:   stat.regular?.a  ?? null,
          points:    stat.regular?.tp ?? null,
        })
      }
      console.log(`  ✓ ${career.length} stints`)
    } catch (err) {
      // Career fetch failing shouldn't kill the whole import
      console.warn(`  ⚠ Could not fetch career for ${fullName}: ${(err as Error).message}`)

      // At minimum, record the stint on this team for this season
      const dbTeam = await upsertTeam({ ep_id: epTeamId, name: `Team ${epTeamId}`, league: null, country: null })
      await upsertStint({ player_id: dbPlayer.id, team_id: dbTeam.id, season: seasonShort })
    }
  }

  console.log('\nRebuilding connection graph...')
  await rebuildConnections()
  console.log('✓ Done\n')
}

main().catch(err => { console.error(err); process.exit(1) })
