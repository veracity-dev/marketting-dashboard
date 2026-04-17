-- ============================================================
-- Supabase / PostgreSQL Schema — Google Analytics 4 Pipeline
-- Run this fresh in Supabase SQL Editor (drop tables first if re-creating)
-- ============================================================

-- 0. GA4 Properties registry (one row per property)
--    Populated automatically by n8n on each sync.
CREATE TABLE IF NOT EXISTS ga_properties (
  property_id  TEXT PRIMARY KEY,
  display_name TEXT        NOT NULL DEFAULT '',
  last_synced  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1. Daily overview KPIs (one row per property per day)
CREATE TABLE IF NOT EXISTS ga_daily_overview (
  id                   BIGSERIAL PRIMARY KEY,
  property_id          TEXT          NOT NULL,
  report_date          DATE          NOT NULL,
  sessions             INTEGER       NOT NULL DEFAULT 0,
  total_users          INTEGER       NOT NULL DEFAULT 0,
  new_users            INTEGER       NOT NULL DEFAULT 0,
  screen_page_views    INTEGER       NOT NULL DEFAULT 0,
  bounce_rate          NUMERIC(6,4)  NOT NULL DEFAULT 0,
  avg_session_duration NUMERIC(10,2) NOT NULL DEFAULT 0,
  engagement_rate      NUMERIC(6,4)  NOT NULL DEFAULT 0,
  engaged_sessions     INTEGER       NOT NULL DEFAULT 0,
  collected_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ga_daily_overview_property_date
  ON ga_daily_overview (property_id, report_date);

-- 2. E-commerce metrics (one row per property per day)
CREATE TABLE IF NOT EXISTS ga_ecommerce (
  id                      BIGSERIAL PRIMARY KEY,
  property_id             TEXT          NOT NULL,
  report_date             DATE          NOT NULL,
  total_revenue           NUMERIC(14,2) NOT NULL DEFAULT 0,
  transactions            INTEGER       NOT NULL DEFAULT 0,
  avg_purchase_revenue    NUMERIC(14,2) NOT NULL DEFAULT 0,
  session_conversion_rate NUMERIC(6,4)  NOT NULL DEFAULT 0,
  purchase_to_view_rate   NUMERIC(6,4)  NOT NULL DEFAULT 0,
  collected_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ga_ecommerce_property_date
  ON ga_ecommerce (property_id, report_date);

-- 3. Traffic sources breakdown (one row per property + date + channel + source/medium)
-- Only session-scoped metrics used — compatible with session dimensions in GA4 API.
CREATE TABLE IF NOT EXISTS ga_traffic_sources (
  id              BIGSERIAL PRIMARY KEY,
  property_id     TEXT          NOT NULL,
  report_date     DATE          NOT NULL,
  channel_group   TEXT          NOT NULL DEFAULT '',
  source_medium   TEXT          NOT NULL DEFAULT '',
  sessions        INTEGER       NOT NULL DEFAULT 0,
  bounce_rate     NUMERIC(6,4)  NOT NULL DEFAULT 0,
  engagement_rate NUMERIC(6,4)  NOT NULL DEFAULT 0,
  collected_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ga_traffic_sources_property_date_channel_source
  ON ga_traffic_sources (property_id, report_date, channel_group, source_medium);

-- 4. Top pages performance (one row per property + date + page path)
CREATE TABLE IF NOT EXISTS ga_top_pages (
  id                   BIGSERIAL PRIMARY KEY,
  property_id          TEXT          NOT NULL,
  report_date          DATE          NOT NULL,
  page_path            TEXT          NOT NULL DEFAULT '',
  page_title           TEXT          NOT NULL DEFAULT '',
  screen_page_views    INTEGER       NOT NULL DEFAULT 0,
  avg_session_duration NUMERIC(10,2) NOT NULL DEFAULT 0,
  bounce_rate          NUMERIC(6,4)  NOT NULL DEFAULT 0,
  engagement_rate      NUMERIC(6,4)  NOT NULL DEFAULT 0,
  collected_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ga_top_pages_property_date_path
  ON ga_top_pages (property_id, report_date, page_path);

-- 5. Device & geographic breakdown (one row per property + date + device + country)
CREATE TABLE IF NOT EXISTS ga_device_geo (
  id              BIGSERIAL PRIMARY KEY,
  property_id     TEXT        NOT NULL,
  report_date     DATE        NOT NULL,
  device_category TEXT        NOT NULL DEFAULT '',
  country         TEXT        NOT NULL DEFAULT '',
  sessions        INTEGER     NOT NULL DEFAULT 0,
  total_users     INTEGER     NOT NULL DEFAULT 0,
  collected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ga_device_geo_property_date_device_country
  ON ga_device_geo (property_id, report_date, device_category, country);

-- ============================================================
-- Indexes for common dashboard query patterns
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ga_daily_overview_date   ON ga_daily_overview   (property_id, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_ga_ecommerce_date        ON ga_ecommerce        (property_id, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_ga_traffic_sources_date  ON ga_traffic_sources  (property_id, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_ga_top_pages_date        ON ga_top_pages        (property_id, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_ga_top_pages_views       ON ga_top_pages        (property_id, screen_page_views DESC);
CREATE INDEX IF NOT EXISTS idx_ga_device_geo_date       ON ga_device_geo       (property_id, report_date DESC);

-- ============================================================
-- Schema & table permissions
-- PostgreSQL 15+ (Supabase) revoked default PUBLIC grants on the public
-- schema. These grants must be applied explicitly for all Supabase roles.
-- ============================================================

-- Schema-level access for all roles
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Full access for backend roles (n8n writes via service_role, migrations via postgres)
GRANT ALL ON ALL TABLES    IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;

-- Read-only access for frontend roles (Next.js dashboard queries)
GRANT SELECT ON ALL TABLES    IN SCHEMA public TO anon, authenticated;
GRANT USAGE  ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Ensure future tables also inherit these grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon, authenticated;

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE ga_daily_overview  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga_ecommerce       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga_traffic_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga_top_pages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga_device_geo      ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all GA data
CREATE POLICY "Allow read for authenticated" ON ga_daily_overview  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read for authenticated" ON ga_ecommerce       FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read for authenticated" ON ga_traffic_sources FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read for authenticated" ON ga_top_pages       FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read for authenticated" ON ga_device_geo      FOR SELECT USING (auth.role() = 'authenticated');

-- Service role (used by n8n) can read and write
CREATE POLICY "Allow service role write" ON ga_daily_overview  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role write" ON ga_ecommerce       FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role write" ON ga_traffic_sources FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role write" ON ga_top_pages       FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role write" ON ga_device_geo      FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- 7. Refresh log — n8n INSERTs one row here as its VERY LAST
--    step. The dashboard detects completion by polling for any
--    row with id > last_known_id. Each run = one new row.
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_log (
  id            BIGSERIAL    PRIMARY KEY,
  property_id   TEXT         NOT NULL,
  status        TEXT         NOT NULL DEFAULT 'done',   -- 'done' or 'error'
  error_message TEXT,                                    -- populated on failure
  completed_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE refresh_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read for authenticated" ON refresh_log FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow service role write"     ON refresh_log FOR ALL    USING (auth.role() = 'service_role');
