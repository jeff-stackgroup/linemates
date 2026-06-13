/**
 * Elite Prospects API client — full coverage of v1 spec.
 *
 * Auth: apiKey query param (all endpoints except /search which is public).
 * Base: https://api.eliteprospects.com/v1
 *
 * Rate limits (requests/minute):
 *   Explorer  (free, 1k/mo)  : 10
 *   Personal  (5k/mo)        : 60
 *   Commercial($990/yr, 50k) : 120
 *   Enterprise(250k+)        : 300+
 */

import 'dotenv/config'

const BASE = 'https://api.eliteprospects.com/v1'

export const API_KEY = process.env.EP_API_KEY ?? ''

// Tokens-per-second based on tier (detected from env or overridable)
const RPS = API_KEY
  ? (process.env.EP_RPS ? parseFloat(process.env.EP_RPS) : 2) // 120/min commercial default
  : (1 / 6)  // 10/min free

const INTERVAL_MS = Math.ceil(1000 / RPS)

let lastAt = 0

async function get<T>(path: string, params: Record<string, string | number | boolean> = {}): Promise<T> {
  const now = Date.now()
  const wait = INTERVAL_MS - (now - lastAt)
  if (wait > 0) await new Promise(r => setTimeout(r, wait))
  lastAt = Date.now()

  const qs = new URLSearchParams()
  if (API_KEY) qs.set('apiKey', API_KEY)
  for (const [k, v] of Object.entries(params)) qs.set(k, String(v))

  const url = `${BASE}${path}?${qs}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })

  if (res.status === 429) {
    // Back off 30s on rate limit
    console.warn('  Rate limited — waiting 30s...')
    await new Promise(r => setTimeout(r, 30_000))
    return get(path, params)
  }

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`EP ${res.status} ${path}: ${body.slice(0, 300)}`)
  }

  return res.json() as Promise<T>
}

/** Paginate through all pages of a list endpoint, yielding items in batches. */
async function* paginate<T>(
  path: string,
  params: Record<string, string | number | boolean> = {},
  pageSize = 100,
): AsyncGenerator<T[]> {
  let offset = 0
  while (true) {
    const res = await get<EPListResponse<T>>(path, { ...params, limit: pageSize, offset })
    const items = res.data ?? []
    if (items.length === 0) break
    yield items
    if (items.length < pageSize) break
    offset += pageSize
  }
}

// ── Shared response shape ─────────────────────────────────────────────────

interface EPListResponse<T> {
  data: T[]
  _meta?: { totalCount?: number }
}

// ── Types ─────────────────────────────────────────────────────────────────

export interface EPLeague {
  id: number
  slug: string
  name: string
  fullName?: string
  country?: EPCountry
  leagueLevel?: number        // 1 = top tier in country
  type?: string               // 'professional' | 'amateur' | 'junior'
}

export interface EPSeason {
  slug: string                // "2018-2019"
  startYear: number
  endYear: number
  league?: { slug: string; name: string }
}

export interface EPCountry {
  id: number
  slug: string
  name: string
  iso2?: string
  iso3?: string
}

export interface EPPlayer {
  id: number
  firstName: string
  lastName: string
  name?: string               // full name (some endpoints use this)
  position?: string           // 'F' | 'D' | 'G'
  country?: EPCountry
  dateOfBirth?: string        // "1990-01-15"
  age?: number
  imageUrl?: string
  height?: number             // cm
  weight?: number             // kg
  shoots?: string             // 'L' | 'R'
}

export interface EPTeam {
  id: number
  name: string
  fullName?: string
  country?: EPCountry
  league?: { slug: string; name: string }
  leagueLevel?: number
}

export interface EPPlayerStat {
  id: number
  player: EPPlayer
  team: EPTeam
  league: EPLeague
  season: EPSeason
  gameType?: string            // 'REGULAR_SEASON' | 'PLAYOFFS'
  regular?: EPSkaterStats | EPGoalieStats
  postseason?: EPSkaterStats | EPGoalieStats
}

export interface EPSkaterStats {
  gp?: number; g?: number; a?: number; tp?: number
  pim?: number; pm?: number; ppg?: number; toi?: string
}

export interface EPGoalieStats {
  gp?: number; w?: number; l?: number; t?: number
  sa?: number; sv?: number; ga?: number; gaa?: number
  svp?: number; so?: number
}

export interface EPStaff {
  id: number
  firstName: string
  lastName: string
  country?: EPCountry
  dateOfBirth?: string
  imageUrl?: string
}

export interface EPStaffStat {
  id: number
  staff: EPStaff
  team: EPTeam
  league: EPLeague
  season: EPSeason
  role?: string               // 'HEAD_COACH' | 'ASSISTANT_COACH' | 'GM' etc.
}

export interface EPTransfer {
  id: number
  player: EPPlayer
  fromTeam?: EPTeam
  toTeam?: EPTeam
  date?: string
  type?: string               // 'SIGNING' | 'TRADE' | 'LOAN' | 'FREE_AGENT'
}

// ── Search (no key required) ──────────────────────────────────────────────

export async function search(query: string): Promise<{ players: EPPlayer[]; teams: EPTeam[]; staff: EPStaff[] }> {
  const res = await get<{ data: { players?: EPPlayer[]; teams?: EPTeam[]; staff?: EPStaff[] } }>('/search', { q: query })
  return {
    players: res.data.players ?? [],
    teams:   res.data.teams   ?? [],
    staff:   res.data.staff   ?? [],
  }
}

// ── Players ───────────────────────────────────────────────────────────────

export function requireKey(): void {
  if (!API_KEY) throw new Error('EP_API_KEY not set — add it to .env.local')
}

export async function getPlayer(epId: number): Promise<EPPlayer> {
  requireKey()
  const res = await get<{ data: EPPlayer }>(`/players/${epId}`)
  return res.data
}

/** All seasonal stats for a player across their entire career. */
export async function getPlayerStats(epId: number): Promise<EPPlayerStat[]> {
  requireKey()
  const items: EPPlayerStat[] = []
  for await (const batch of paginate<EPPlayerStat>(`/players/${epId}/stats`)) {
    items.push(...batch)
  }
  return items
}

export async function getPlayerTransfers(epId: number): Promise<EPTransfer[]> {
  requireKey()
  const items: EPTransfer[] = []
  for await (const batch of paginate<EPTransfer>(`/players/${epId}/transfers`)) {
    items.push(...batch)
  }
  return items
}

// ── Leagues ───────────────────────────────────────────────────────────────

export async function getLeagues(params: { type?: string; leagueLevel?: number } = {}): Promise<EPLeague[]> {
  requireKey()
  const items: EPLeague[] = []
  for await (const batch of paginate<EPLeague>('/leagues', params as Record<string, string | number | boolean>)) {
    items.push(...batch)
  }
  return items
}

export async function getLeagueSeasons(leagueSlug: string): Promise<EPSeason[]> {
  requireKey()
  const items: EPSeason[] = []
  for await (const batch of paginate<EPSeason>(`/leagues/${leagueSlug}/seasons`)) {
    items.push(...batch)
  }
  return items
}

/**
 * THE BULK IMPORT KEY: every player-stat record for a league season.
 * One call per season gives you every player, team, and stat line.
 */
export async function getLeagueSeasonPlayerStats(
  leagueSlug: string,
  season: string,               // EP format: "2018-2019"
): Promise<EPPlayerStat[]> {
  requireKey()
  const items: EPPlayerStat[] = []
  for await (const batch of paginate<EPPlayerStat>(
    `/leagues/${leagueSlug}/seasons/${season}/player-stats`,
    { gameType: 'REGULAR_SEASON' },
  )) {
    items.push(...batch)
  }
  return items
}

// ── Teams ─────────────────────────────────────────────────────────────────

export async function getTeam(epId: number): Promise<EPTeam> {
  requireKey()
  const res = await get<{ data: EPTeam }>(`/teams/${epId}`)
  return res.data
}

export async function getTeamPlayers(epId: number): Promise<EPPlayer[]> {
  requireKey()
  const items: EPPlayer[] = []
  for await (const batch of paginate<EPPlayer>(`/teams/${epId}/players`)) {
    items.push(...batch)
  }
  return items
}

export async function getTeamStats(epId: number): Promise<EPPlayerStat[]> {
  requireKey()
  const items: EPPlayerStat[] = []
  for await (const batch of paginate<EPPlayerStat>(`/teams/${epId}/stats`)) {
    items.push(...batch)
  }
  return items
}

// ── Staff (coaches & management) ──────────────────────────────────────────

export async function getStaff(epId: number): Promise<EPStaff> {
  requireKey()
  const res = await get<{ data: EPStaff }>(`/staff/${epId}`)
  return res.data
}

export async function getStaffStats(epId: number): Promise<EPStaffStat[]> {
  requireKey()
  const items: EPStaffStat[] = []
  for await (const batch of paginate<EPStaffStat>(`/staff/${epId}/stats`)) {
    items.push(...batch)
  }
  return items
}

// ── Transfers ─────────────────────────────────────────────────────────────

export async function getRecentTransfers(params: { limit?: number; teamId?: number; leagueSlug?: string } = {}): Promise<EPTransfer[]> {
  requireKey()
  const items: EPTransfer[] = []
  for await (const batch of paginate<EPTransfer>('/transfers', params as Record<string, string | number | boolean>, params.limit ?? 100)) {
    items.push(...batch)
    if (params.limit && items.length >= params.limit) break
  }
  return items.slice(0, params.limit)
}

// ── Countries ─────────────────────────────────────────────────────────────

export async function getCountries(): Promise<EPCountry[]> {
  requireKey()
  const items: EPCountry[] = []
  for await (const batch of paginate<EPCountry>('/countries')) {
    items.push(...batch)
  }
  return items
}

// ── Utility ───────────────────────────────────────────────────────────────

/** Convert EP season slug "2018-2019" → our DB format "2018-19" */
export function normalizeSeason(slug: string): string {
  const m = slug.match(/^(\d{4})-(\d{4})$/)
  return m ? `${m[1]}-${m[2].slice(2)}` : slug
}

/** Convert our DB format "2018-19" → EP slug "2018-2019" */
export function expandSeason(short: string): string {
  const m = short.match(/^(\d{4})-(\d{2})$/)
  if (!m) return short
  return `${m[1]}-${parseInt(m[1]) + 1}`
}
