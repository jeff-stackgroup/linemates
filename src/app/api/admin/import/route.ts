/**
 * POST /api/admin/import
 *
 * Trigger a player import from the web. Protected by ADMIN_SECRET header.
 * Body: { type: "player", epId: 12345 }
 *       { type: "team",   epTeamId: 455, season: "2018-19" }
 *
 * This runs in a Next.js serverless function — for large imports use the
 * CLI scripts instead (no timeout).
 */

import { createClient } from '@supabase/supabase-js'

const ADMIN_SECRET = process.env.ADMIN_SECRET
const EP_API_KEY   = process.env.EP_API_KEY

function unauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
}

async function epFetch(path: string) {
  const url = `https://api.eliteprospects.com/v1${path}?apiKey=${EP_API_KEY}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`EP ${res.status}: ${await res.text()}`)
  return res.json()
}

function normalizeSeason(slug: string): string {
  const m = slug.match(/^(\d{4})-(\d{4})$/)
  return m ? `${m[1]}-${m[2].slice(2)}` : slug
}

export async function POST(req: Request) {
  if (!ADMIN_SECRET) return unauthorized()
  if (req.headers.get('x-admin-secret') !== ADMIN_SECRET) return unauthorized()
  if (!EP_API_KEY) return new Response(JSON.stringify({ error: 'EP_API_KEY not configured' }), { status: 503 })

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await req.json()
  const log: string[] = []

  try {
    if (body.type === 'player') {
      const epId = body.epId as number
      const raw  = await epFetch(`/players/${epId}`)
      const p    = raw.data
      const name = `${p.firstName} ${p.lastName}`

      const { data: player, error: pe } = await db.from('players')
        .upsert({ ep_id: epId, name, position: p.position ?? null, nationality: p.country?.name ?? null }, { onConflict: 'ep_id' })
        .select('id, name').single()
      if (pe) throw pe
      log.push(`Upserted player: ${player!.name}`)

      const career = await epFetch(`/players/${epId}/stats?limit=100`)
      for (const stat of career.data ?? []) {
        if (!stat.team?.id) continue
        const { data: team } = await db.from('teams')
          .upsert({ ep_id: stat.team.id, name: stat.team.name, league: stat.team.league?.name ?? null }, { onConflict: 'ep_id' })
          .select('id').single()
        if (!team) continue
        await db.from('stints').upsert(
          { player_id: player!.id, team_id: team.id, season: normalizeSeason(stat.season.slug), games: stat.regular?.gp ?? null, goals: stat.regular?.g ?? null, assists: stat.regular?.a ?? null, points: stat.regular?.tp ?? null },
          { onConflict: 'player_id,team_id,season' }
        )
      }
      log.push(`Imported ${career.data?.length ?? 0} career stints`)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db.rpc as any)('build_connections')
      log.push('Rebuilt connections graph')

      return Response.json({ ok: true, log })
    }

    return Response.json({ error: 'Unknown import type' }, { status: 400 })
  } catch (err) {
    return Response.json({ error: (err as Error).message, log }, { status: 500 })
  }
}
