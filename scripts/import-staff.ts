/**
 * Import a staff member (coach, GM) and their career history.
 * Coaches are connection nodes — two players who shared the same coach
 * in the same season are one hop apart via staff.
 *
 * Usage:
 *   npx tsx scripts/import-staff.ts <ep_staff_id>
 *   npx tsx scripts/import-staff.ts --name "Mike Babcock"
 */

import 'dotenv/config'
import { search, getStaff, getStaffStats, requireKey } from './ep-client'
import { db } from './db-client'

requireKey()

async function upsertStaffMember(data: {
  ep_id: number; name: string; nationality?: string | null
  birthdate?: string | null; image_url?: string | null
}): Promise<{ id: string; name: string }> {
  const { data: row, error } = await db.from('staff')
    .upsert(data, { onConflict: 'ep_id' })
    .select('id, name')
    .single()
  if (error) throw error
  return row as { id: string; name: string }
}

async function importStaff(epId: number) {
  console.log(`\nImporting staff member EP ${epId}...`)

  const s = await getStaff(epId)
  const name = `${s.firstName} ${s.lastName}`

  const dbStaff = await upsertStaffMember({
    ep_id:       s.id,
    name,
    nationality: s.country?.name ?? null,
    birthdate:   s.dateOfBirth ?? null,
    image_url:   s.imageUrl ?? null,
  })
  console.log(`  ✓ ${dbStaff.name}`)

  const career = await getStaffStats(epId)
  console.log(`  ${career.length} career stints`)

  for (const stint of career) {
    if (!stint.team?.id) continue

    // Upsert team
    const { data: team } = await db.from('teams')
      .upsert(
        { ep_id: stint.team.id, name: stint.team.name, league: stint.league?.name ?? null, country: stint.team.country?.name ?? null },
        { onConflict: 'ep_id' }
      )
      .select('id')
      .single()
    if (!team) continue

    const season = stint.season.slug.replace(/^(\d{4})-(\d{4})$/, (_, a, b) => `${a}-${b.slice(2)}`)

    await db.from('staff_stints').upsert(
      { staff_id: dbStaff.id, team_id: team.id, season, role: stint.role ?? null },
      { onConflict: 'staff_id,team_id,season,role' }
    )
    console.log(`    → ${stint.team.name} (${season}) — ${stint.role ?? 'unknown role'}`)
  }
}

async function main() {
  const args = process.argv.slice(2)
  let epId: number

  const nameFlag = args.indexOf('--name')
  if (nameFlag !== -1) {
    const query = args[nameFlag + 1]
    const results = await search(query)
    if (!results.staff.length) { console.error('No staff found'); process.exit(1) }
    results.staff.slice(0, 5).forEach((s, i) =>
      console.log(`[${i}] ${s.firstName} ${s.lastName} (EP ${s.id})`)
    )
    epId = results.staff[0].id
    console.log(`\nAuto-selecting: ${results.staff[0].firstName} ${results.staff[0].lastName}`)
  } else if (args[0]) {
    epId = parseInt(args[0], 10)
  } else {
    console.error('Usage: npx tsx scripts/import-staff.ts <ep_id>\n       npx tsx scripts/import-staff.ts --name "Coach Name"')
    process.exit(1)
  }

  await importStaff(epId)
  console.log('\n✓ Done')
}

main().catch(err => { console.error(err); process.exit(1) })
