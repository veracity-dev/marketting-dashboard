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

export type DataSource = 'ga4' | 'gsc' | 'semrush' | 'google_ads' | 'meta' | 'linkedin' | 'agent'

// ── Semrush types ────────────────────────────────────────────────────────────

export interface SemrushProject {
  id: string
  name: string
  domain: string
}

export interface SemrushDomainOverview {
  domain: string
  semrush_rank: number        // global Semrush Rank (lower = more traffic)
  organic_keywords: number
  organic_traffic: number
  organic_cost: number        // value of organic traffic in $ (Traffic Cost)
  paid_keywords: number
  paid_traffic: number
  paid_cost: number
  database: string
}

export interface SemrushKeyword {
  keyword: string
  position: number
  previous_position: number | null
  volume: number
  cpc: number
  url: string
  traffic_pct: number
}

export interface SemrushCompetitor {
  domain: string
  relevance: number           // 0-1 competitor overlap score
  common_keywords: number
  organic_keywords: number
  organic_traffic: number
  organic_cost: number
  paid_keywords: number
}

export interface SemrushDomainData {
  overview: SemrushDomainOverview | null
  keywords: SemrushKeyword[]
  competitors: SemrushCompetitor[]
  fetchedAt: string
}

// ── Semrush Backlinks API types (analytics/v1 base URL) ───────────────────────

export interface SemrushBacklinksOverview {
  authority_score: number   // 0-100, Semrush Authority Score
  total: number             // total backlinks
  domains_num: number       // referring domains
  urls_num: number          // referring URLs
  ips_num: number           // referring IPs
  follows_num: number       // dofollow links
  nofollows_num: number     // nofollow links
  texts_num: number         // text links
  images_num: number        // image links
}

export interface SemrushRefDomain {
  domain: string
  authority_score: number
  backlinks_num: number
  country: string
  first_seen: string
  last_seen: string
  follows_num: number
  nofollows_num: number
}

export interface SemrushAnchor {
  anchor: string
  domains_num: number
  backlinks_num: number
  follows_num: number
  nofollows_num: number
  first_seen: string   // Unix epoch seconds as string
  last_seen: string
}

export interface SemrushTld {
  zone: string
  domains_num: number
  backlinks_num: number
}

export interface SemrushGeo {
  country_name: string
  domains_num: number
  backlinks_num: number
}

export interface SemrushPage {
  source_url: string
  source_title: string
  page_ascore: number
  backlinks_num: number
  last_seen: string    // Unix epoch seconds as string
}

export interface SemrushBacklinksData {
  overview: SemrushBacklinksOverview | null
  ref_domains: SemrushRefDomain[]
  anchors: SemrushAnchor[]
  tld: SemrushTld[]
  geo: SemrushGeo[]
  pages: SemrushPage[]
  error?: string           // 'zero_units' | 'no_access' | 'api_error' | 'invalid_domain'
  error_message?: string   // raw API error string for display
  fetchedAt: string
}

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

// ── Chat / AI Agent types ───────────────────────────────────────────────────

export interface ChatSession {
  id: number
  title: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: number
  session_id: number
  role: 'user' | 'assistant'
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface ParsedSegment {
  type: 'text' | 'table' | 'chart'
  content: string
  tableHeaders?: string[]
  tableRows?: string[][]
  chartData?: Record<string, unknown>[]
  chartType?: 'bar' | 'line' | 'pie'
  chartConfig?: { xKey: string; yKeys: string[] }
}
