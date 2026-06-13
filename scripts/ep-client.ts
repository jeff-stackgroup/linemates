/**
 * Elite Prospects API client.
 *
 * Two tiers:
 *   Free search API  — no key, player/team search only
 *   Commercial API   — EP_API_KEY required, full career stats + rosters
 *
 * Rate limiting: free=10 req/min, explorer=10 req/min, commercial=120 req/min
 * We default to 10 req/min (one request every 6 seconds) unless overridden.
 */

const FREE_BASE    = 'https://api.eliteprospects.com/v1'
const COMMERCIAL_BASE = 'https://api.eliteprospects.com/v1'

const API_KEY = process.env.EP_API_KEY ?? ''

// Minimal rate limiter: one token per intervalMs
let lastRequestAt = 0
const RATE_INTERVAL_MS = API_KEY ? 1000 : 6000   // 60/min commercial, 10/min free

async function rateLimitedFetch(url: string): Promise<unknown> {
  const now = Date.now()
  const wait = RATE_INTERVAL_MS - (now - lastRequestAt)
  if (wait > 0) await new Promise(r => setTimeout(r, wait))
  lastRequestAt = Date.now()

  const headers: Record<string, string> = { 'Accept': 'application/json' }
  if (API_KEY) headers['Authorization'] = `Bearer ${API_KEY}`

  const res = await fetch(url, { headers })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`EP API ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.json()
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface EPPlayerSummary {
  id: number
  firstName: string
  lastName: string
  fullName: string
  position?: string
  country?: { name: string; iso2: string }
  dateOfBirth?: string
  imageUrl?: string
}

export interface EPCareerStat {
  season: { slug: string; startYear: number }
  team: { id: number; name: string; league?: { name: string }; country?: { name: string } }
  regular?: { gp?: number; g?: number; a?: number; tp?: number }
}

export interface EPRosterPlayer {
  player: EPPlayerSummary
  position?: string
  stats?: { regular?: { gp?: number; g?: number; a?: number; tp?: number } }
}

// ── Search (free, no key needed) ─────────────────────────────────────────

export async function searchPlayers(query: string): Promise<EPPlayerSummary[]> {
  const url = `${FREE_BASE}/players?q=${encodeURIComponent(query)}&limit=10`
  const raw = await rateLimitedFetch(url) as { data?: EPPlayerSummary[] } | EPPlayerSummary[]
  // Free API returns array directly; commercial wraps in { data: [] }
  return Array.isArray(raw) ? raw as EPPlayerSummary[] : ((raw as { data?: EPPlayerSummary[] }).data ?? [])
}

// ── Commercial API (requires EP_API_KEY) ──────────────────────────────────

function requireKey() {
  if (!API_KEY) throw new Error('EP_API_KEY is not set. Set it in .env.local to use commercial endpoints.')
}

export async function getPlayer(epId: number): Promise<EPPlayerSummary> {
  requireKey()
  const url = `${COMMERCIAL_BASE}/players/${epId}?apiKey=${API_KEY}`
  const raw = await rateLimitedFetch(url) as { data: EPPlayerSummary }
  return raw.data
}

export async function getPlayerCareer(epId: number): Promise<EPCareerStat[]> {
  requireKey()
  const url = `${COMMERCIAL_BASE}/players/${epId}/stats?apiKey=${API_KEY}&limit=100&sort=season`
  const raw = await rateLimitedFetch(url) as { data: EPCareerStat[] }
  return raw.data ?? []
}

export async function getTeamRoster(epTeamId: number, season: string): Promise<EPRosterPlayer[]> {
  requireKey()
  // EP season format: "2018-2019"
  const url = `${COMMERCIAL_BASE}/teams/${epTeamId}/stats?apiKey=${API_KEY}&season=${season}&limit=100`
  const raw = await rateLimitedFetch(url) as { data: EPRosterPlayer[] }
  return raw.data ?? []
}
