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

  // Run both probes in parallel with a tight 3 s timeout each.
  const [analyticsRes, backlinksRes] = await Promise.allSettled([
    // ── Analytics API units ──────────────────────────────────────────────────
    // Returns a plain integer on plans that expose this endpoint.
    fetch(`https://api.semrush.com/?type=api_units&key=${apiKey}`, {
      signal: AbortSignal.timeout(3_000),
    }),

    // ── Backlinks API probe ──────────────────────────────────────────────────
    // No dedicated units endpoint — detect ERROR 132 (zero balance) vs valid data.
    fetch(
      `https://api.semrush.com/analytics/v1/?key=${apiKey}&type=backlinks_overview&target=semrush.com&target_type=root_domain&export_columns=total`,
      { signal: AbortSignal.timeout(3_000) }
    ),
  ])

  let analyticsUnits: number | null = null
  if (analyticsRes.status === 'fulfilled' && analyticsRes.value.ok) {
    const text = (await analyticsRes.value.text()).trim()
    const n = Number(text)
    if (!isNaN(n)) analyticsUnits = n
  }

  let backlinksUnits: 'ok' | 'zero' | 'unknown' = 'unknown'
  if (backlinksRes.status === 'fulfilled' && backlinksRes.value.ok) {
    const text = (await backlinksRes.value.text()).trim()
    if (text.includes('132') && text.toUpperCase().includes('UNITS BALANCE IS ZERO')) {
      backlinksUnits = 'zero'
    } else if (!text.startsWith('ERROR')) {
      backlinksUnits = 'ok'
    }
  }

  return NextResponse.json({ analyticsUnits, backlinksUnits })
}
