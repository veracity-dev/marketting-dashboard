import { NextRequest, NextResponse } from 'next/server'
import type { SemrushDomainData } from '@/lib/types'

const BASE = 'https://api.semrush.com/'

/**
 * Parse Semrush semicolon-separated CSV into an array of objects.
 * Silently handles "NOTHING FOUND", ERROR responses, and empty bodies.
 */
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  if (lines[0].startsWith('ERROR') || lines[1]?.toUpperCase().startsWith('NOTHING FOUND')) return []
  const headers = lines[0].split(';')
  return lines.slice(1).map((line) => {
    const values = line.split(';')
    return Object.fromEntries(headers.map((h, i) => [h.trim(), (values[i] ?? '').trim()]))
  })
}

function cleanDomain(raw: string): string {
  return raw
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .split('/')[0]
    .toLowerCase()
    .trim()
}

function buildUrl(apiKey: string, params: Record<string, string>): string {
  return BASE + '?' + new URLSearchParams({ key: apiKey, ...params }).toString()
}

export async function GET(req: NextRequest) {
  const sp       = req.nextUrl.searchParams
  const domain   = cleanDomain(sp.get('domain') ?? '')
  const database = sp.get('database') ?? 'us'

  if (!domain) {
    return NextResponse.json({ error: 'domain query param is required' }, { status: 400 })
  }

  const apiKey = process.env.SEMRUSH_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'SEMRUSH_API_KEY not configured' }, { status: 500 })
  }

  const timeout = AbortSignal.timeout(20_000)

  // ── Fetch three endpoints in parallel ─────────────────────────────────────
  //
  // Standard plan includes:
  //   • domain_ranks            — overall domain metrics (no Ab/As — backlinks & authority score
  //                               require separate Backlinks API subscription)
  //   • domain_organic          — top organic ranking keywords
  //   • domain_organic_organic  — top organic competitors by keyword overlap
  //
  const [overviewResult, keywordsResult, competitorsResult] = await Promise.allSettled([
    fetch(
      buildUrl(apiKey, {
        type:           'domain_ranks',
        export_columns: 'Dn,Rk,Or,Ot,Oc,Ad,At,Ac',   // Ab (backlinks) & As (authority) excluded — not on Standard
        domain,
        database,
      }),
      { signal: timeout }
    ),
    fetch(
      buildUrl(apiKey, {
        type:           'domain_organic',
        export_columns: 'Ph,Po,Pp,Pd,Nq,Cp,Ur,Tr',
        domain,
        database,
        display_limit:  '200',
        display_sort:   'tr_desc',
      }),
      { signal: timeout }
    ),
    fetch(
      buildUrl(apiKey, {
        type:           'domain_organic_organic',
        export_columns: 'Dn,Cr,Np,Or,Ot,Oc,Ad',
        domain,
        database,
        display_limit:  '10',
      }),
      { signal: timeout }
    ),
  ])

  // ── Parse overview ─────────────────────────────────────────────────────────
  let overview: SemrushDomainData['overview'] = null
  if (overviewResult.status === 'fulfilled' && overviewResult.value.ok) {
    const text = await overviewResult.value.text()
    const rows = parseCsv(text)
    if (rows.length) {
      const r = rows[0]
      overview = {
        domain,
        semrush_rank:     Number(r['Rank'])                 || 0,
        organic_keywords: Number(r['Organic Keywords'])     || 0,
        organic_traffic:  Number(r['Organic Traffic'])      || 0,
        organic_cost:     Number(r['Organic Cost'])         || 0,
        paid_keywords:    Number(r['Adwords Keywords'])     || 0,
        paid_traffic:     Number(r['Adwords Traffic'])      || 0,
        paid_cost:        Number(r['Adwords Cost'])         || 0,
        database,
      }
    }
  }

  // ── Parse keywords ─────────────────────────────────────────────────────────
  let keywords: SemrushDomainData['keywords'] = []
  if (keywordsResult.status === 'fulfilled' && keywordsResult.value.ok) {
    const text = await keywordsResult.value.text()
    const rows = parseCsv(text)
    keywords = rows
      .map((r) => ({
        keyword:           r['Keyword']            ?? '',
        position:          Number(r['Position'])   || 0,
        previous_position: r['Previous Position'] && r['Previous Position'] !== ''
                             ? Number(r['Previous Position'])
                             : null,
        volume:            Number(r['Search Volume']) || 0,
        cpc:               parseFloat(r['CPC']        ?? '0') || 0,
        url:               r['Url']               ?? '',
        traffic_pct:       parseFloat(r['Traffic (%)'] ?? '0') || 0,
      }))
      .filter((k) => k.keyword && k.position > 0 && k.position <= 100)
  }

  // ── Parse competitors ──────────────────────────────────────────────────────
  let competitors: SemrushDomainData['competitors'] = []
  if (competitorsResult.status === 'fulfilled' && competitorsResult.value.ok) {
    const text = await competitorsResult.value.text()
    const rows = parseCsv(text)
    competitors = rows
      .map((r) => ({
        domain:           r['Domain']               ?? '',
        relevance:        parseFloat(r['Competitor Relevance'] ?? '0') || 0,
        common_keywords:  Number(r['Common Keywords'])  || 0,
        organic_keywords: Number(r['Organic Keywords']) || 0,
        organic_traffic:  Number(r['Organic Traffic'])  || 0,
        organic_cost:     Number(r['Organic Cost'])     || 0,
        paid_keywords:    Number(r['Adwords Keywords']) || 0,
      }))
      .filter((c) => c.domain)
  }

  const body: SemrushDomainData = {
    overview,
    keywords,
    competitors,
    fetchedAt: new Date().toISOString(),
  }

  return NextResponse.json(body)
}
