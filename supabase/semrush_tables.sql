-- ═══════════════════════════════════════════════════════════════════════════
-- Semrush Integration — Supabase Schema
-- Run once in the Supabase SQL Editor (or via psql / migration tool).
--
-- Design principles:
--   • Organic tables key on (domain, database) — results differ per region.
--   • Backlinks tables key on (domain) only — Backlinks API is global.
--   • Array tables (keywords, competitors, ref_domains, anchors, tld, geo,
--     linking_pages) are replaced wholesale on each refresh (DELETE + INSERT),
--     so stale rows never accumulate.
--   • Overview tables use UPSERT (ON CONFLICT DO UPDATE).
--   • collected_at records when the data was last fetched from Semrush.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── 1. Domain Overview (Organic) ─────────────────────────────────────────────
--    One row per (domain, database).  Updated on each refresh.
CREATE TABLE IF NOT EXISTS semrush_domain_overview (
  id               BIGSERIAL    PRIMARY KEY,
  domain           TEXT         NOT NULL,
  database         TEXT         NOT NULL DEFAULT 'us',
  semrush_rank     BIGINT,
  organic_keywords INTEGER,
  organic_traffic  INTEGER,
  organic_cost     NUMERIC(14, 2),
  paid_keywords    INTEGER,
  paid_traffic     INTEGER,
  paid_cost        NUMERIC(14, 2),
  collected_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),

  UNIQUE (domain, database)
);

CREATE INDEX IF NOT EXISTS idx_smr_overview_domain
  ON semrush_domain_overview (domain, database);


-- ── 2. Organic Keywords ───────────────────────────────────────────────────────
--    Top 200 organic keywords per (domain, database).
--    Replaced wholesale on refresh — no stale rows.
CREATE TABLE IF NOT EXISTS semrush_keywords (
  id                BIGSERIAL    PRIMARY KEY,
  domain            TEXT         NOT NULL,
  database          TEXT         NOT NULL DEFAULT 'us',
  keyword           TEXT         NOT NULL,
  position          SMALLINT,
  previous_position SMALLINT,
  volume            INTEGER,
  cpc               NUMERIC(10, 2),
  url               TEXT,
  traffic_pct       NUMERIC(8, 4),
  collected_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smr_keywords_domain
  ON semrush_keywords (domain, database, position);


-- ── 3. Organic Competitors ───────────────────────────────────────────────────
--    Top 10 organic competitors by keyword overlap.
--    Replaced wholesale on refresh.
CREATE TABLE IF NOT EXISTS semrush_competitors (
  id                BIGSERIAL    PRIMARY KEY,
  domain            TEXT         NOT NULL,
  database          TEXT         NOT NULL DEFAULT 'us',
  competitor_domain TEXT         NOT NULL,
  relevance         NUMERIC(6, 4),
  common_keywords   INTEGER,
  organic_keywords  INTEGER,
  organic_traffic   INTEGER,
  organic_cost      NUMERIC(14, 2),
  paid_keywords     INTEGER,
  collected_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smr_competitors_domain
  ON semrush_competitors (domain, database);


-- ── 4. Backlinks Overview ────────────────────────────────────────────────────
--    One row per domain (backlinks data is global — no database column).
--    Updated on each refresh via UPSERT.
CREATE TABLE IF NOT EXISTS semrush_backlinks_overview (
  id             BIGSERIAL    PRIMARY KEY,
  domain         TEXT         NOT NULL UNIQUE,
  authority_score SMALLINT,
  total          BIGINT,
  domains_num    INTEGER,
  urls_num       INTEGER,
  ips_num        INTEGER,
  follows_num    BIGINT,
  nofollows_num  BIGINT,
  texts_num      BIGINT,
  images_num     BIGINT,
  collected_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smr_bl_overview_domain
  ON semrush_backlinks_overview (domain);


-- ── 5. Referring Domains ─────────────────────────────────────────────────────
--    Top 15 referring domains per target domain.
--    Replaced wholesale on refresh.
CREATE TABLE IF NOT EXISTS semrush_ref_domains (
  id              BIGSERIAL    PRIMARY KEY,
  domain          TEXT         NOT NULL,   -- target domain
  ref_domain      TEXT         NOT NULL,   -- the referring domain
  authority_score SMALLINT,
  backlinks_num   INTEGER,
  follows_num     INTEGER,
  nofollows_num   INTEGER,
  country         VARCHAR(10),
  first_seen      BIGINT,                  -- Unix epoch seconds (from Semrush)
  last_seen       BIGINT,
  collected_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smr_ref_domains_domain
  ON semrush_ref_domains (domain, backlinks_num DESC);


-- ── 6. Anchor Texts ──────────────────────────────────────────────────────────
--    Top 15 anchor texts per target domain.
--    Replaced wholesale on refresh.
CREATE TABLE IF NOT EXISTS semrush_anchors (
  id             BIGSERIAL    PRIMARY KEY,
  domain         TEXT         NOT NULL,
  anchor         TEXT         NOT NULL DEFAULT '',
  domains_num    INTEGER,
  backlinks_num  INTEGER,
  follows_num    INTEGER,
  nofollows_num  INTEGER,
  first_seen     BIGINT,
  last_seen      BIGINT,
  collected_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smr_anchors_domain
  ON semrush_anchors (domain, backlinks_num DESC);


-- ── 7. TLD Distribution ──────────────────────────────────────────────────────
--    Top 10 TLDs of referring domains.
--    Replaced wholesale on refresh.
CREATE TABLE IF NOT EXISTS semrush_tld (
  id             BIGSERIAL    PRIMARY KEY,
  domain         TEXT         NOT NULL,
  zone           TEXT         NOT NULL,
  domains_num    INTEGER,
  backlinks_num  INTEGER,
  collected_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smr_tld_domain
  ON semrush_tld (domain);


-- ── 8. Geographic Distribution ───────────────────────────────────────────────
--    Top 10 countries of referring domains.
--    Replaced wholesale on refresh.
CREATE TABLE IF NOT EXISTS semrush_geo (
  id             BIGSERIAL    PRIMARY KEY,
  domain         TEXT         NOT NULL,
  country_name   TEXT         NOT NULL,
  domains_num    INTEGER,
  backlinks_num  INTEGER,
  collected_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smr_geo_domain
  ON semrush_geo (domain);


-- ── 9. Top Linking Pages ─────────────────────────────────────────────────────
--    Top 10 external pages that contain the most links to this domain.
--    Replaced wholesale on refresh.
CREATE TABLE IF NOT EXISTS semrush_linking_pages (
  id             BIGSERIAL    PRIMARY KEY,
  domain         TEXT         NOT NULL,
  source_url     TEXT         NOT NULL,
  source_title   TEXT,
  page_ascore    SMALLINT,
  backlinks_num  INTEGER,
  last_seen      BIGINT,
  collected_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smr_linking_pages_domain
  ON semrush_linking_pages (domain, backlinks_num DESC);


-- ── Row Level Security (optional but recommended) ────────────────────────────
-- Enable RLS and allow service role full access.
-- If you use anon key on the client, add appropriate policies.

ALTER TABLE semrush_domain_overview    ENABLE ROW LEVEL SECURITY;
ALTER TABLE semrush_keywords           ENABLE ROW LEVEL SECURITY;
ALTER TABLE semrush_competitors        ENABLE ROW LEVEL SECURITY;
ALTER TABLE semrush_backlinks_overview ENABLE ROW LEVEL SECURITY;
ALTER TABLE semrush_ref_domains        ENABLE ROW LEVEL SECURITY;
ALTER TABLE semrush_anchors            ENABLE ROW LEVEL SECURITY;
ALTER TABLE semrush_tld                ENABLE ROW LEVEL SECURITY;
ALTER TABLE semrush_geo                ENABLE ROW LEVEL SECURITY;
ALTER TABLE semrush_linking_pages      ENABLE ROW LEVEL SECURITY;

-- Allow the service role (used in API routes) unrestricted access.
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'semrush_domain_overview','semrush_keywords','semrush_competitors',
    'semrush_backlinks_overview','semrush_ref_domains','semrush_anchors',
    'semrush_tld','semrush_geo','semrush_linking_pages'
  ]
  LOOP
    -- DROP IF EXISTS makes this block safe to re-run
    EXECUTE format('DROP POLICY IF EXISTS "service_role_all" ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY "service_role_all" ON %I
       FOR ALL TO service_role USING (true) WITH CHECK (true)', tbl
    );
  END LOOP;
END;
$$;
