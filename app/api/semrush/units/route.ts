import { NextResponse } from 'next/server'

/**
 * Returns the remaining API unit balance for both Semrush API pools:
 *   • analytics  — old API (domain_ranks, domain_organic, etc.)
 *   • backlinks  — new analytics/v1 API
 *
 * The old API does NOT expose a public units endpoint on Standard plan,
 * so we do a lightweight probe request and read the response to infer
 * whether the pool is active.  The backlinks API returns ERROR 132 when
 * units hit zero, which is what we surface to the UI.
 */
export async function GET() {
  const apiKey = process.env.SEMRUSH_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'SEMRUSH_API_KEY not configured' }, { status: 500 })
  }

  // ── Analytics API units (old base URL) ───────────────────────────────────
  // Some plan types expose this endpoint; returns a plain integer if supported.
  let analyticsUnits: number | null = null
  try {
    const r = await fetch(
      `https://api.semrush.com/?type=api_units&key=${apiKey}`,
      { signal: AbortSignal.timeout(5_000) }
    )
    const text = (await r.text()).trim()
    const n = Number(text)
    if (!isNaN(n)) analyticsUnits = n
  } catch {}

  // ── Backlinks API units (analytics/v1 base URL) ───────────────────────────
  // No dedicated units endpoint exists on this base.  We probe with a
  // minimal domain_ranks call and detect the ERROR 132 response.
  let backlinksUnits: 'ok' | 'zero' | 'unknown' = 'unknown'
  try {
    const r = await fetch(
      `https://api.semrush.com/analytics/v1/?key=${apiKey}&type=backlinks_overview&target=semrush.com&target_type=root_domain&export_columns=total`,
      { signal: AbortSignal.timeout(5_000) }
    )
    const text = (await r.text()).trim()
    if (text.includes('132') && text.toUpperCase().includes('UNITS BALANCE IS ZERO')) {
      backlinksUnits = 'zero'
    } else if (!text.startsWith('ERROR')) {
      backlinksUnits = 'ok'
    }
  } catch {}

  return NextResponse.json({ analyticsUnits, backlinksUnits })
}
