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

export interface GAProperty {
  property_id:  string
  display_name: string
  account_name: string
  account_id:   string
  last_synced:  string | null
}

export type RefreshStatus = 'idle' | 'triggering' | 'polling' | 'done' | 'error'

export type DataSource = 'ga4' | 'gsc' | 'google_ads' | 'meta' | 'linkedin'

// ── Google Search Console types ──────────────────────────────────────────────

export interface GSCDailyOverview {
  id: number
  site_url: string
  report_date: string
  clicks: number
  impressions: number
  ctr: number        // 0..1
  position: number   // avg SERP position
  collected_at: string
}

export interface GSCQuery {
  id: number
  site_url: string
  report_date: string
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
  collected_at: string
}

export interface GSCPage {
  id: number
  site_url: string
  report_date: string
  page: string
  clicks: number
  impressions: number
  ctr: number
  position: number
  collected_at: string
}

export interface GSCCountry {
  id: number
  site_url: string
  report_date: string
  country: string
  clicks: number
  impressions: number
  ctr: number
  position: number
  collected_at: string
}

export interface GSCDevice {
  id: number
  site_url: string
  report_date: string
  device: string
  clicks: number
  impressions: number
  ctr: number
  position: number
  collected_at: string
}

export interface GSCData {
  overview: GSCDailyOverview[]
  queries: GSCQuery[]
  pages: GSCPage[]
  countries: GSCCountry[]
  devices: GSCDevice[]
  lastCollectedAt: string | null
}

export interface GSCSite {
  site_url: string
  permission_level: string
  last_synced: string | null
}
