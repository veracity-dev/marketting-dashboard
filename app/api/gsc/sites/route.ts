import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase env vars not configured')
  return createClient(url, key)
}

// GET — returns sites stored in Supabase `gsc_sites` (merged with last_synced)
export async function GET() {
  try {
    const sb = getSupabase()
    const { data, error } = await sb
      .from('gsc_sites')
      .select('*')
      .order('site_url', { ascending: true })
    if (error) {
      console.error('[gsc/sites] Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ sites: data ?? [] })
  } catch (err) {
    console.error('[gsc/sites] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — calls the n8n list-sites webhook (synchronous) and upserts results into gsc_sites.
export async function POST() {
  try {
    const webhookUrl = process.env.N8N_GSC_SITES_WEBHOOK_URL
    if (!webhookUrl) {
      return NextResponse.json({ error: 'N8N_GSC_SITES_WEBHOOK_URL not configured' }, { status: 500 })
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json({ error: `n8n returned ${res.status}: ${text}` }, { status: 502 })
    }

    const payload = await res.json()
    const sites: Array<{ site_url: string; permission_level?: string }> = payload.sites ?? []

    // Upsert into gsc_sites so the dashboard has a persistent list
    const sb = getSupabase()
    if (sites.length > 0) {
      const rows = sites.map((s) => ({
        site_url: s.site_url,
        permission_level: s.permission_level ?? '',
      }))
      const { error } = await sb
        .from('gsc_sites')
        .upsert(rows, { onConflict: 'site_url' })
      if (error) console.error('[gsc/sites] upsert error:', error)
    }

    const { data } = await sb
      .from('gsc_sites')
      .select('*')
      .order('site_url', { ascending: true })

    return NextResponse.json({ sites: data ?? [] })
  } catch (err) {
    console.error('[gsc/sites] POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
