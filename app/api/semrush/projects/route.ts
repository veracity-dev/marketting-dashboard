import { NextResponse } from 'next/server'
import type { SemrushProject } from '@/lib/types'

function extractDomain(raw: string): string {
  try {
    const url = raw.startsWith('http') ? raw : `https://${raw}`
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return raw.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0]
  }
}

export async function GET() {
  const apiKey = process.env.SEMRUSH_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'SEMRUSH_API_KEY not configured', projects: [] },
      { status: 500 }
    )
  }

  try {
    const res = await fetch('https://api.semrush.com/management/v1/projects', {
      headers: { Authorization: `Bearer ${apiKey}` },
      // 10 s timeout
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      console.warn('[semrush/projects] management API returned', res.status)
      return NextResponse.json({ projects: [] })
    }

    const payload = await res.json()
    const raw: unknown[] = Array.isArray(payload.projects) ? payload.projects : []

    const projects: SemrushProject[] = raw.map((p: any) => ({
      id:     String(p.project_id ?? p.id ?? ''),
      name:   String(p.project_name ?? p.name ?? p.url ?? ''),
      domain: extractDomain(String(p.url ?? p.domain ?? '')),
    })).filter((p) => p.domain)

    return NextResponse.json({ projects })
  } catch (err) {
    console.warn('[semrush/projects] fetch error:', err)
    return NextResponse.json({ projects: [] })
  }
}
