-- ============================================================
-- kidsfashion-intel · canonical Postgres schema
-- Apply via: psql $DATABASE_URL -f db/schema.sql
-- Or load individual migrations in order from db/migrations/.
-- ============================================================

-- pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- catalog mirrored from KidsFashionClub seed.ts
-- ============================================================
CREATE TABLE IF NOT EXISTS catalog_sku (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id         TEXT UNIQUE NOT NULL,            -- product.id from seed.ts
  slug                TEXT UNIQUE NOT NULL,
  name_pt             TEXT NOT NULL,
  name_en             TEXT NOT NULL,
  team_slug           TEXT NOT NULL,                    -- normalized: 'benfica','sporting','barcelona'
  team_display        TEXT NOT NULL,                    -- raw: 'Sporting CP', 'FC Barcelona'
  season              TEXT NOT NULL,                    -- '2024','2024/25','2025/26'
  kit_type            TEXT NOT NULL,                    -- home|away|third|training|retro|goalkeeper|fan
  version             TEXT NOT NULL,                    -- adepto|player|authentic
  gender_age          TEXT NOT NULL,                    -- kids|adult|unisex
  sizes               TEXT[] NOT NULL DEFAULT '{}',     -- ['28','10-11','12-13'] etc
  retail_price_eur    NUMERIC(10, 2),
  in_stock            BOOLEAN NOT NULL DEFAULT false,
  is_featured         BOOLEAN NOT NULL DEFAULT false,
  is_clearance        BOOLEAN NOT NULL DEFAULT false,
  source_commit       TEXT,                              -- git sha of seed.ts at sync time
  imported_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_sku_team_season ON catalog_sku(team_slug, season, kit_type);
CREATE INDEX IF NOT EXISTS ix_sku_external    ON catalog_sku(external_id);

-- ============================================================
-- normalization aux tables
-- ============================================================
CREATE TABLE IF NOT EXISTS team_aliases (
  alias               TEXT PRIMARY KEY,
  team_slug           TEXT NOT NULL,
  source              TEXT NOT NULL DEFAULT 'manual'    -- 'manual'|'derived'|'reviewer'
);
CREATE INDEX IF NOT EXISTS ix_team_aliases_slug ON team_aliases(team_slug);

CREATE TABLE IF NOT EXISTS size_aliases (
  raw                 TEXT NOT NULL,
  region              TEXT NOT NULL,                    -- 'EU'|'US'|'UK'|'KFC' (our internal)
  gender_age          TEXT NOT NULL,
  canonical           TEXT NOT NULL,
  PRIMARY KEY (raw, region, gender_age)
);

CREATE TABLE IF NOT EXISTS fx_rates (
  day                 DATE NOT NULL,
  currency            CHAR(3) NOT NULL,
  rate_to_eur         NUMERIC(12, 6) NOT NULL,
  PRIMARY KEY (day, currency)
);

-- ============================================================
-- sources registry
-- ============================================================
CREATE TABLE IF NOT EXISTS sources (
  id                  SMALLSERIAL PRIMARY KEY,
  name                TEXT UNIQUE NOT NULL,
  type                TEXT NOT NULL,                    -- 'api'|'scrape'
  country             TEXT,
  base_url            TEXT,
  enabled             BOOLEAN NOT NULL DEFAULT true,
  rate_per_hour       INT NOT NULL,
  last_block_at       TIMESTAMPTZ,
  blocked_until       TIMESTAMPTZ,
  consecutive_errors  INT NOT NULL DEFAULT 0
);

-- ============================================================
-- listings
-- ============================================================
CREATE TABLE IF NOT EXISTS listings_raw (
  id                  BIGSERIAL PRIMARY KEY,
  source_id           SMALLINT NOT NULL REFERENCES sources(id),
  external_id         TEXT NOT NULL,
  payload             JSONB NOT NULL,
  scraped_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_raw_scraped  ON listings_raw(scraped_at);
CREATE INDEX IF NOT EXISTS ix_raw_external ON listings_raw(source_id, external_id);

COMMENT ON TABLE listings_raw IS 'TTL 30 days, purged by cleanup cron';

CREATE TABLE IF NOT EXISTS listings_normalized (
  id                  BIGSERIAL PRIMARY KEY,
  source_id           SMALLINT NOT NULL REFERENCES sources(id),
  external_id         TEXT NOT NULL,
  url                 TEXT,
  sku_id              UUID REFERENCES catalog_sku(id),
  team_slug           TEXT,
  season              TEXT,
  kit_type            TEXT,
  gender_age          TEXT,
  size                TEXT,                              -- single size for THIS listing
  condition           TEXT,
  price_eur           NUMERIC(10, 2),
  price_original      NUMERIC(10, 2),
  currency            CHAR(3),
  shipping_eur        NUMERIC(10, 2),
  country             CHAR(2),
  brand               TEXT,
  seller_id_hash      TEXT,
  seller_rating       NUMERIC(3, 2),
  photos              TEXT[],
  title_raw           TEXT,
  listed_at           TIMESTAMPTZ,
  first_seen_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  sold_at             TIMESTAMPTZ,
  match_confidence    NUMERIC(3, 2),
  UNIQUE(source_id, external_id)
);
CREATE INDEX IF NOT EXISTS ix_norm_sku       ON listings_normalized(sku_id) WHERE sku_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_norm_team      ON listings_normalized(team_slug, season);
CREATE INDEX IF NOT EXISTS ix_norm_active    ON listings_normalized(sold_at) WHERE sold_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_norm_lastseen  ON listings_normalized(last_seen_at);

-- ============================================================
-- timeseries and metrics
-- ============================================================
CREATE TABLE IF NOT EXISTS price_snapshots (
  sku_id              UUID NOT NULL REFERENCES catalog_sku(id),
  source_id           SMALLINT NOT NULL REFERENCES sources(id),
  day                 DATE NOT NULL,
  n_listings          INT NOT NULL,
  p25_eur             NUMERIC(10, 2),
  p50_eur             NUMERIC(10, 2),
  p75_eur             NUMERIC(10, 2),
  min_eur             NUMERIC(10, 2),
  max_eur             NUMERIC(10, 2),
  PRIMARY KEY (sku_id, source_id, day)
);

CREATE TABLE IF NOT EXISTS sold_signals (
  listing_id          BIGINT PRIMARY KEY REFERENCES listings_normalized(id),
  sold_at             TIMESTAMPTZ NOT NULL,
  inferred_from       TEXT NOT NULL,                    -- 'disappeared'|'marked_sold'|'status_change'|'price_below_median'|'hot_item_24h'|'cold_delisting'
  confidence          NUMERIC(3, 2)
);

CREATE TABLE IF NOT EXISTS metrics_daily (
  sku_id              UUID NOT NULL REFERENCES catalog_sku(id),
  day                 DATE NOT NULL,
  active_listings     INT NOT NULL DEFAULT 0,
  sold_today          INT NOT NULL DEFAULT 0,
  sold_7d             INT NOT NULL DEFAULT 0,
  sold_30d            INT NOT NULL DEFAULT 0,
  median_price_eur    NUMERIC(10, 2),
  median_price_7d_avg NUMERIC(10, 2),
  demand_score        NUMERIC(5, 2),
  supply_score        NUMERIC(5, 2),
  recommendation      TEXT,
  PRIMARY KEY (sku_id, day)
);

-- ============================================================
-- audit / observability
-- ============================================================
CREATE TABLE IF NOT EXISTS scrape_runs (
  id                  BIGSERIAL PRIMARY KEY,
  source_id           SMALLINT NOT NULL REFERENCES sources(id),
  started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at            TIMESTAMPTZ,
  requests_made       INT NOT NULL DEFAULT 0,
  listings_found      INT NOT NULL DEFAULT 0,
  listings_new        INT NOT NULL DEFAULT 0,
  errors              JSONB,
  status              TEXT                              -- 'ok'|'partial'|'blocked'|'error'
);
CREATE INDEX IF NOT EXISTS ix_runs_source_started ON scrape_runs(source_id, started_at DESC);

CREATE TABLE IF NOT EXISTS alerts_log (
  id                  BIGSERIAL PRIMARY KEY,
  kind                TEXT NOT NULL,
  payload             JSONB NOT NULL,
  sent_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered           BOOLEAN
);
