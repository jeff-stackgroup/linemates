/**
 * Supabase service-role client for import scripts.
 * Uses the service role key so RLS is bypassed during ETL.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import 'dotenv/config'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
}

// Untyped client for scripts — avoids fighting Supabase's generic inference
// with hand-crafted Database types. ETL scripts are internal tooling.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: SupabaseClient<any> = createClient(url, key)

// ── Upsert helpers ────────────────────────────────────────────────────────

export async function upsertPlayer(data: {
  ep_id: number | null
  name: string
  position?: string | null
  nationality?: string | null
  birthdate?: string | null
  image_url?: string | null
}): Promise<{ id: string; name: string }> {
  const conflict = data.ep_id !== null ? 'ep_id' : 'name'
  const { data: row, error } = await db
    .from('players')
    .upsert(data, { onConflict: conflict, ignoreDuplicates: false })
    .select('id, name')
    .single()
  if (error) throw error
  return row as { id: string; name: string }
}

export async function upsertTeam(data: {
  ep_id: number | null
  name: string
  league?: string | null
  country?: string | null
}): Promise<{ id: string; name: string }> {
  const conflict = data.ep_id !== null ? 'ep_id' : 'name'
  const { data: row, error } = await db
    .from('teams')
    .upsert(data, { onConflict: conflict, ignoreDuplicates: false })
    .select('id, name')
    .single()
  if (error) throw error
  return row as { id: string; name: string }
}

export async function upsertStint(data: {
  player_id: string
  team_id: string
  season: string
  games?: number | null
  goals?: number | null
  assists?: number | null
  points?: number | null
}): Promise<void> {
  const { error } = await db
    .from('stints')
    .upsert(data, { onConflict: 'player_id,team_id,season', ignoreDuplicates: false })
  if (error) throw error
}

export async function rebuildConnections(): Promise<void> {
  const { error } = await db.rpc('build_connections')
  if (error) throw error
}
