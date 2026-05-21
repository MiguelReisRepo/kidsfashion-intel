-- ============================================================
-- 0002 · metrics rollup functions + top_demand_30d view
-- Apply via: psql $DATABASE_URL -f db/migrations/0002_metrics_functions.sql
-- Idempotent (CREATE OR REPLACE).
-- ============================================================

-- ------------------------------------------------------------
-- kfi_infer_sold_signals
-- Marks any active listing whose last_seen_at is older than
-- `p_stale_hours` as sold via the 'disappeared' heuristic.
-- Confidence: 0.6 (a delisting is a fair but imperfect proxy).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION kfi_infer_sold_signals(p_stale_hours INT DEFAULT 48)
RETURNS TABLE (inferred_count BIGINT) AS $$
DECLARE
  v_threshold TIMESTAMPTZ := now() - make_interval(hours => p_stale_hours);
  v_count BIGINT;
BEGIN
  WITH candidates AS (
    SELECT id
    FROM listings_normalized
    WHERE sold_at IS NULL
      AND last_seen_at < v_threshold
      AND sku_id IS NOT NULL
  ),
  marked AS (
    UPDATE listings_normalized ln
       SET sold_at = v_threshold
      FROM candidates c
     WHERE ln.id = c.id
    RETURNING ln.id
  ),
  signals AS (
    INSERT INTO sold_signals (listing_id, sold_at, inferred_from, confidence)
    SELECT id, v_threshold, 'disappeared', 0.6 FROM marked
    ON CONFLICT (listing_id) DO NOTHING
    RETURNING listing_id
  )
  SELECT COUNT(*) INTO v_count FROM signals;
  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- kfi_compute_price_snapshots
-- Snapshots median / quartile prices per (sku, source) for `p_day`,
-- computed over currently-active listings.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION kfi_compute_price_snapshots(p_day DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (snapshot_count BIGINT) AS $$
DECLARE
  v_count BIGINT;
BEGIN
  WITH agg AS (
    SELECT
      sku_id,
      source_id,
      COUNT(*) AS n,
      percentile_cont(0.25) WITHIN GROUP (ORDER BY price_eur) AS p25,
      percentile_cont(0.50) WITHIN GROUP (ORDER BY price_eur) AS p50,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY price_eur) AS p75,
      MIN(price_eur) AS min_p,
      MAX(price_eur) AS max_p
    FROM listings_normalized
    WHERE sku_id IS NOT NULL
      AND sold_at IS NULL
      AND price_eur IS NOT NULL
    GROUP BY sku_id, source_id
  ),
  upsert AS (
    INSERT INTO price_snapshots (sku_id, source_id, day, n_listings, p25_eur, p50_eur, p75_eur, min_eur, max_eur)
    SELECT sku_id, source_id, p_day, n, p25, p50, p75, min_p, max_p FROM agg
    ON CONFLICT (sku_id, source_id, day) DO UPDATE
      SET n_listings = EXCLUDED.n_listings,
          p25_eur    = EXCLUDED.p25_eur,
          p50_eur    = EXCLUDED.p50_eur,
          p75_eur    = EXCLUDED.p75_eur,
          min_eur    = EXCLUDED.min_eur,
          max_eur    = EXCLUDED.max_eur
    RETURNING sku_id
  )
  SELECT COUNT(*) INTO v_count FROM upsert;
  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- kfi_compute_metrics_daily
-- Per SKU rollup of demand / supply for `p_day`. Recommendation
-- comes from a transparent rule set:
--   STOCK      we don't carry it and demand exists
--   RAISE      we carry it, demand is healthy, market price > retail
--   HOLD       we carry it and demand is steady
--   LIQUIDATE  we carry it but 30d sales are zero
--   SKIP       we don't carry it and supply >> demand
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION kfi_compute_metrics_daily(p_day DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (sku_count BIGINT) AS $$
DECLARE
  v_count BIGINT;
BEGIN
  WITH active AS (
    SELECT
      sku_id,
      COUNT(*) AS n_active,
      percentile_cont(0.50) WITHIN GROUP (ORDER BY price_eur) AS median_price
    FROM listings_normalized
    WHERE sku_id IS NOT NULL
      AND sold_at IS NULL
      AND price_eur IS NOT NULL
    GROUP BY sku_id
  ),
  sold AS (
    SELECT
      sku_id,
      COUNT(*) FILTER (WHERE sold_at::date = p_day)              AS sold_today,
      COUNT(*) FILTER (WHERE sold_at >= p_day - INTERVAL '7 days')  AS sold_7d,
      COUNT(*) FILTER (WHERE sold_at >= p_day - INTERVAL '30 days') AS sold_30d
    FROM listings_normalized
    WHERE sku_id IS NOT NULL
      AND sold_at IS NOT NULL
    GROUP BY sku_id
  ),
  trailing AS (
    SELECT sku_id, AVG(median_price_eur) AS median_7d_avg
    FROM metrics_daily
    WHERE day BETWEEN p_day - INTERVAL '7 days' AND p_day - INTERVAL '1 day'
    GROUP BY sku_id
  ),
  joined AS (
    SELECT
      cs.id AS sku_id,
      cs.in_stock,
      cs.retail_price_eur,
      COALESCE(a.n_active, 0)            AS active_listings,
      COALESCE(s.sold_today, 0)          AS sold_today,
      COALESCE(s.sold_7d, 0)             AS sold_7d,
      COALESCE(s.sold_30d, 0)            AS sold_30d,
      a.median_price                     AS median_price_eur,
      t.median_7d_avg                    AS median_price_7d_avg
    FROM catalog_sku cs
    LEFT JOIN active    a ON a.sku_id = cs.id
    LEFT JOIN sold      s ON s.sku_id = cs.id
    LEFT JOIN trailing  t ON t.sku_id = cs.id
  ),
  scored AS (
    SELECT
      sku_id,
      active_listings,
      sold_today, sold_7d, sold_30d,
      median_price_eur, median_price_7d_avg,
      -- demand_score: sales velocity weighted against supply (clamped 0-100).
      LEAST(100,
        ROUND(
          (sold_30d::NUMERIC * 10.0) / GREATEST(active_listings, 1)
        , 2)
      ) AS demand_score,
      active_listings::NUMERIC AS supply_score,
      CASE
        WHEN NOT in_stock AND sold_30d >= 5                                                  THEN 'STOCK'
        WHEN     in_stock AND sold_30d >= 3
                          AND median_price_eur IS NOT NULL
                          AND retail_price_eur IS NOT NULL
                          AND median_price_eur > retail_price_eur * 1.10                     THEN 'RAISE'
        WHEN     in_stock AND sold_30d = 0                                                   THEN 'LIQUIDATE'
        WHEN NOT in_stock AND sold_30d = 0 AND active_listings > 10                          THEN 'SKIP'
        ELSE                                                                                       'HOLD'
      END AS recommendation
    FROM joined
  ),
  upsert AS (
    INSERT INTO metrics_daily (
      sku_id, day, active_listings, sold_today, sold_7d, sold_30d,
      median_price_eur, median_price_7d_avg, demand_score, supply_score, recommendation
    )
    SELECT sku_id, p_day, active_listings, sold_today, sold_7d, sold_30d,
           median_price_eur, median_price_7d_avg, demand_score, supply_score, recommendation
    FROM scored
    ON CONFLICT (sku_id, day) DO UPDATE
      SET active_listings     = EXCLUDED.active_listings,
          sold_today          = EXCLUDED.sold_today,
          sold_7d             = EXCLUDED.sold_7d,
          sold_30d            = EXCLUDED.sold_30d,
          median_price_eur    = EXCLUDED.median_price_eur,
          median_price_7d_avg = EXCLUDED.median_price_7d_avg,
          demand_score        = EXCLUDED.demand_score,
          supply_score        = EXCLUDED.supply_score,
          recommendation      = EXCLUDED.recommendation
    RETURNING sku_id
  )
  SELECT COUNT(*) INTO v_count FROM upsert;
  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- top_demand_30d
-- Most actionable SKUs based on the latest metrics_daily snapshot.
-- Query directly from the dashboard / Discord digest.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW top_demand_30d AS
WITH latest AS (
  SELECT MAX(day) AS day FROM metrics_daily
)
SELECT
  cs.id                AS sku_id,
  cs.slug,
  cs.name_pt,
  cs.team_display,
  cs.season,
  cs.kit_type,
  cs.gender_age,
  cs.retail_price_eur,
  cs.in_stock,
  md.day,
  md.active_listings,
  md.sold_30d,
  md.sold_7d,
  md.sold_today,
  md.median_price_eur,
  md.median_price_7d_avg,
  md.demand_score,
  md.recommendation
FROM catalog_sku cs
LEFT JOIN metrics_daily md
       ON md.sku_id = cs.id
      AND md.day = (SELECT day FROM latest)
WHERE COALESCE(md.sold_30d, 0) > 0
   OR COALESCE(md.active_listings, 0) > 0
ORDER BY
  COALESCE(md.demand_score, 0) DESC,
  COALESCE(md.sold_30d, 0)     DESC,
  cs.team_display ASC;
