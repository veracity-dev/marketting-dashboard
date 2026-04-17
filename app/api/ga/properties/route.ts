import { NextResponse } from 'next/server'
import { createSign } from 'crypto'

// ── Service-account JWT helpers ──────────────────────────────────────────────

function b64url(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input
  return buf.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

async function getServiceAccountToken(): Promise<string | null> {
  const email  = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const rawKey = process.env.GOOGLE_PRIVATE_KEY

  if (!email || !rawKey) {
    console.error('[ga/properties] Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY')
    return null
  }

  // .env stores newlines as literal \n — restore them
  const privateKey = rawKey.replace(/\\n/g, '\n')

  const now        = Math.floor(Date.now() / 1000)
  const jwtHeader  = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const jwtPayload = b64url(JSON.stringify({
    iss:   email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  }))

  const sigInput  = `${jwtHeader}.${jwtPayload}`
  const signer    = createSign('RSA-SHA256')
  signer.update(sigInput)
  const signature = b64url(signer.sign(privateKey))
  const jwt       = `${sigInput}.${signature}`

  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  jwt,
    }),
  })
  const data = await res.json()

  if (!data.access_token) {
    console.error('[ga/properties] Token exchange failed:', data)
    return null
  }
  return data.access_token as string
}

// ── Last-synced helper (Supabase) ────────────────────────────────────────────

async function fetchLastSynced(): Promise<Record<string, string>> {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await supabase
      .from('ga_properties')
      .select('property_id, last_synced')
    const map: Record<string, string> = {}
    for (const row of data ?? []) {
      if (row.last_synced) map[row.property_id] = row.last_synced
    }
    return map
  } catch {
    return {}
  }
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET() {
  const accessToken = await getServiceAccountToken()
  if (!accessToken) {
    return NextResponse.json(
      { properties: [], error: 'Service account not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in .env.local' },
      { status: 503 }
    )
  }

  // Fetch GA4 account/property list and last-synced timestamps in parallel
  const [summariesRes, lastSyncedMap] = await Promise.all([
    fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200', {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    fetchLastSynced(),
  ])

  if (!summariesRes.ok) {
    const text = await summariesRes.text()
    console.error('[ga/properties] Admin API error:', summariesRes.status, text)
    return NextResponse.json(
      { properties: [], error: `Google Analytics Admin API returned ${summariesRes.status}. Make sure the service account has been granted access to your GA4 properties.` },
      { status: 502 }
    )
  }

  const summaries = await summariesRes.json()

  const properties = (summaries.accountSummaries ?? []).flatMap((account: any) =>
    (account.propertySummaries ?? [])
      .filter((p: any) => p.propertyType !== 'PROPERTY_TYPE_SUBPROPERTY')
      .map((prop: any) => {
        const propId = prop.property.replace('properties/', '')
        return {
          property_id:  propId,
          display_name: prop.displayName,
          account_name: account.displayName,
          account_id:   account.account.replace('accounts/', ''),
          last_synced:  lastSyncedMap[propId] ?? null,
        }
      })
  )

  return NextResponse.json({ properties })
}
