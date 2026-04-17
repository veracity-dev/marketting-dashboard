import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Polls refresh_log for a NEW row (id > last_log_id) for this property.
// n8n INSERTs one row as its very last step, so a new row = pipeline done.
export async function GET(req: NextRequest) {
  const sp         = req.nextUrl.searchParams
  const propertyId = sp.get('property_id') ?? ''
  const lastLogId  = sp.get('last_log_id') ?? '0'

  if (!propertyId) {
    return NextResponse.json({ error: 'property_id is required' }, { status: 400 })
  }

  try {
    const sb = getSupabase()

    const { data, error } = await sb
      .from('refresh_log')
      .select('id, status, error_message')
      .eq('property_id', propertyId)
      .gt('id', Number(lastLogId))
      .order('id', { ascending: false })
      .limit(1)

    if (error) {
      console.error('[refresh/status] query error:', error)
      throw error
    }

    if (data && data.length > 0) {
      const row = data[0]
      return NextResponse.json({
        status:        row.status,              // 'done' or 'error'
        error_message: row.error_message ?? null,
      })
    }

    return NextResponse.json({ status: 'pending' })
  } catch (err) {
    console.error('[refresh/status] supabase error:', err)
    return NextResponse.json({ status: 'pending' })
  }
}
