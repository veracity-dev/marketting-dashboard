-- ============================================================
-- Supabase / PostgreSQL Schema — Google Search Console Pipeline
-- Run AFTER supabase-schema-ga4.sql (reuses refresh_log table)
-- ============================================================

-- 0. GSC Sites registry (one row per verified site)
--    Populated automatically by n8n on each sync.
CREATE TABLE IF NOT EXISTS gsc_sites (
  site_url         TEXT PRIMARY KEY,
  permission_level TEXT        NOT NULL DEFAULT '',
  last_synced      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1. Daily overview (one row per site per day)
CREATE TABLE IF NOT EXISTS gsc_daily_overview (
  id           BIGSERIAL PRIMARY KEY,
  site_url     TEXT          NOT NULL,
  report_date  DATE          NOT NULL,
  clicks       INTEGER       NOT NULL DEFAULT 0,
  impressions  INTEGER       NOT NULL DEFAULT 0,
  ctr          NUMERIC(8,6)  NOT NULL DEFAULT 0,  -- 0..1
  position     NUMERIC(10,4) NOT NULL DEFAULT 0,  -- avg SERP position
  collected_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS gsc_daily_overview_site_date
  ON gsc_daily_overview (site_url, report_date);

-- 2. Top queries (site + date + query)
CREATE TABLE IF NOT EXISTS gsc_queries (
  id           BIGSERIAL PRIMARY KEY,
  site_url     TEXT          NOT NULL,
  report_date  DATE          NOT NULL,
  query        TEXT          NOT NULL DEFAULT '',
  clicks       INTEGER       NOT NULL DEFAULT 0,
  impressions  INTEGER       NOT NULL DEFAULT 0,
  ctr          NUMERIC(8,6)  NOT NULL DEFAULT 0,
  position     NUMERIC(10,4) NOT NULL DEFAULT 0,
  collected_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS gsc_queries_site_date_query
  ON gsc_queries (site_url, report_date, query);

-- 3. Top pages (site + date + page url)
CREATE TABLE IF NOT EXISTS gsc_pages (
  id           BIGSERIAL PRIMARY KEY,
  site_url     TEXT          NOT NULL,
  report_date  DATE          NOT NULL,
  page         TEXT          NOT NULL DEFAULT '',
  clicks       INTEGER       NOT NULL DEFAULT 0,
  impressions  INTEGER       NOT NULL DEFAULT 0,
  ctr          NUMERIC(8,6)  NOT NULL DEFAULT 0,
  position     NUMERIC(10,4) NOT NULL DEFAULT 0,
  collected_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS gsc_pages_site_date_page
  ON gsc_pages (site_url, report_date, page);

-- 4. Country breakdown
CREATE TABLE IF NOT EXISTS gsc_countries (
  id           BIGSERIAL PRIMARY KEY,
  site_url     TEXT          NOT NULL,
  report_date  DATE          NOT NULL,
  country      TEXT          NOT NULL DEFAULT '',
  clicks       INTEGER       NOT NULL DEFAULT 0,
  impressions  INTEGER       NOT NULL DEFAULT 0,
  ctr          NUMERIC(8,6)  NOT NULL DEFAULT 0,
  position     NUMERIC(10,4) NOT NULL DEFAULT 0,
  collected_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS gsc_countries_site_date_country
  ON gsc_countries (site_url, report_date, country);

-- 5. Device breakdown (mobile / desktop / tablet)
CREATE TABLE IF NOT EXISTS gsc_devices (
  id           BIGSERIAL PRIMARY KEY,
  site_url     TEXT          NOT NULL,
  report_date  DATE          NOT NULL,
  device       TEXT          NOT NULL DEFAULT '',
  clicks       INTEGER       NOT NULL DEFAULT 0,
  impressions  INTEGER       NOT NULL DEFAULT 0,
  ctr          NUMERIC(8,6)  NOT NULL DEFAULT 0,
  position     NUMERIC(10,4) NOT NULL DEFAULT 0,
  collected_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS gsc_devices_site_date_device
  ON gsc_devices (site_url, report_date, device);

-- ============================================================
-- Indexes for common dashboard query patterns
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_gsc_daily_overview_date ON gsc_daily_overview (site_url, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_queries_date        ON gsc_queries        (site_url, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_queries_clicks      ON gsc_queries        (site_url, clicks      DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_pages_date          ON gsc_pages          (site_url, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_pages_clicks        ON gsc_pages          (site_url, clicks      DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_countries_date      ON gsc_countries      (site_url, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_devices_date        ON gsc_devices        (site_url, report_date DESC);

-- ============================================================
-- Grants (inherits from ga4 schema if run after, but explicit)
-- ============================================================
GRANT ALL    ON gsc_sites, gsc_daily_overview, gsc_queries, gsc_pages, gsc_countries, gsc_devices TO postgres, service_role;
GRANT SELECT ON gsc_sites, gsc_daily_overview, gsc_queries, gsc_pages, gsc_countries, gsc_devices TO anon, authenticated;

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE gsc_sites          ENABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_daily_overview ENABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_queries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_pages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_countries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_devices        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated" ON gsc_sites          FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read for authenticated" ON gsc_daily_overview FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read for authenticated" ON gsc_queries        FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read for authenticated" ON gsc_pages          FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read for authenticated" ON gsc_countries      FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read for authenticated" ON gsc_devices        FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service role write" ON gsc_sites          FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role write" ON gsc_daily_overview FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role write" ON gsc_queries        FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role write" ON gsc_pages          FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role write" ON gsc_countries      FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role write" ON gsc_devices        FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- NOTE: `refresh_log` is REUSED from supabase-schema-ga4.sql.
--   - For GA4 runs: property_id column stores GA4 property id
--   - For GSC runs: property_id column stores the site_url
-- The UI polls the same way (status id > last_known_id for that site_url).
-- ============================================================
