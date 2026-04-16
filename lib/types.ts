// ── Supabase table row types ─────────────────────────────────────────────────

export interface GADailyOverview {
  id: number
  property_id: string
  report_date: string          // "YYYY-MM-DD"
  sessions: number
  total_users: number
  new_users: number
  screen_page_views: number
  bounce_rate: number          // 0-1
  avg_session_duration: number // seconds
  engagement_rate: number      // 0-1
  engaged_sessions: number
  collected_at: string
}

export interface GAEcommerce {
  id: number
  property_id: string
  report_date: string
  total_revenue: number
  transactions: number
  avg_purchase_revenue: number
  session_conversion_rate: number // 0-1
  purchase_to_view_rate: number   // 0-1
  collected_at: string
}

export interface GATrafficSource {
  id: number
  property_id: string
  report_date: string
  channel_group: string
  source_medium: string
  sessions: number
  bounce_rate: number
  engagement_rate: number
  collected_at: string
}

export interface GATopPage {
  id: number
  property_id: string
  report_date: string
  page_path: string
  page_title: string
  screen_page_views: number
  avg_session_duration: number
  bounce_rate: number
  engagement_rate: number
  collected_at: string
}

export interface GADeviceGeo {
  id: number
  property_id: string
  report_date: string
  device_category: string
  country: string
  sessions: number
  total_users: number
  collected_at: string
}

// ── Aggregated / UI types ────────────────────────────────────────────────────

export interface DateRange {
  start: string   // "YYYY-MM-DD"
  end: string
  label: string
}

export interface GA4Data {
  overview: GADailyOverview[]
  ecommerce: GAEcommerce[]
  traffic: GATrafficSource[]
  pages: GATopPage[]
  deviceGeo: GADeviceGeo[]
  lastCollectedAt: string | null
}

export interface KPISummary {
  sessions: number
  totalUsers: number
  newUsers: number
  pageViews: number
  bounceRate: number
  avgSessionDuration: number
  engagementRate: number
  engagedSessions: number
}

export interface EcommerceSummary {
  totalRevenue: number
  transactions: number
  avgPurchaseRevenue: number
  sessionConversionRate: number
  purchaseToViewRate: number
}

export type RefreshStatus = 'idle' | 'triggering' | 'polling' | 'done' | 'error'

export type DataSource = 'ga4' | 'google_ads' | 'meta' | 'linkedin'
