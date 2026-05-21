# Production bring-up

Step-by-step to take this from a code repo to a running marketplace-intel pipeline. Plan ~2 hours including verification.

## 1 · Supabase project (10 min)

1. https://supabase.com → New project. Free tier is enough for this catalog (~127 SKUs, ~50k listings/month).
2. Project Settings → API → copy `URL` and `service_role` key (the long secret one, NOT `anon`).
3. SQL Editor → paste and run, in this order:
   - `db/schema.sql`
   - `db/seed/sources.sql`
   - `db/migrations/0002_metrics_functions.sql`
4. Verify: SQL Editor → `SELECT name FROM sources;` should return 9 rows (`ebay`, `aliexpress`, …).

## 2 · Marketplace credentials

You only need keys for sources you actually want to run. The rest stay disabled.

### eBay Browse API (required to run fetch-ebay)
- https://developer.ebay.com → "My Account" → Application Keys → Production keyset.
- Copy `App ID (Client ID)` and `Cert ID (Client Secret)`.

### Mercado Livre (optional)
- https://developers.mercadolivre.com → create application → copy `App ID` and `Secret Key`.
- Public search now requires OAuth2 client_credentials (Mercado Livre changed this in 2024).

### Discord (for the daily digest)
- Discord server settings → Integrations → Webhooks → New Webhook → copy URL.

## 3 · GitHub repo secrets and vars (5 min)

GitHub → repo Settings → Secrets and variables → Actions.

**Secrets** (sensitive, encrypted):

| Name | Source |
|---|---|
| `SUPABASE_URL` | Supabase Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Project Settings → API → `service_role` |
| `EBAY_CLIENT_ID` | eBay developer portal |
| `EBAY_CLIENT_SECRET` | eBay developer portal |
| `MERCADOLIVRE_APP_ID` | Optional, only if running ML scraper |
| `MERCADOLIVRE_CLIENT_SECRET` | Optional, same |
| `DISCORD_WEBHOOK_DIGEST` | Discord webhook URL |
| `DISCORD_WEBHOOK_ALERTS` | Optional, defaults to `DIGEST` if missing |

**Variables** (non-sensitive, plain text):

| Name | Default |
|---|---|
| `KIDSFASHION_SEED_URL` | `https://raw.githubusercontent.com/MiguelReisRepo/KidsFashionClub/main/src/data/seed.ts` |
| `EBAY_MARKETPLACE_ID` | `EBAY_GB` |

## 4 · Smoke test each workflow (15 min)

GitHub → Actions tab. For each workflow below, click "Run workflow", check the `dry_run` box (where available), then watch the logs.

| Workflow | What to expect |
|---|---|
| `fetch-ebay` | OAuth ok, "Built catalog queries: 80–120", several "search ok" lines, "runner finished". |
| `fetch-olx-pt` | Catalog sync ok, queries built, "search ok" per query, partial errors allowed but should be a minority. |
| `fetch-mercadolivre` | Skip unless ML creds set. OAuth ok, search ok. |
| `normalize-metrics` | "sold signals inferred", "price snapshots written", "metrics_daily computed". |
| `digest-discord` | "no actionable recommendations today, skipping post" is fine until you have data. |

After dry-runs are green, re-run without `dry_run` for `fetch-ebay` and `fetch-olx-pt`. Wait ~10 min, then in Supabase SQL Editor:

```sql
SELECT source_id, COUNT(*) FROM listings_normalized GROUP BY source_id;
SELECT * FROM scrape_runs ORDER BY started_at DESC LIMIT 10;
```

You should see listings landing.

## 5 · First metrics rollup

After at least 1 full scrape pass:

GitHub → Actions → `normalize-metrics` → Run workflow.

Then in Supabase:

```sql
SELECT recommendation, COUNT(*) FROM metrics_daily WHERE day = CURRENT_DATE GROUP BY recommendation;
SELECT * FROM top_demand_30d LIMIT 20;
```

## 6 · Cron handover

The 4 fetch workflows + `normalize-metrics` + `digest-discord` are already scheduled. Times (UTC) chosen to stagger:

| Workflow | Schedule |
|---|---|
| `fetch-ebay` | hourly at :17 |
| `fetch-mercadolivre` | every 6h at :29 |
| `fetch-olx-pt` | every 4h at :43 |
| `normalize-metrics` | daily 03:47 |
| `digest-discord` | daily 09:30 |

You only act when the digest fires (or when a workflow turns red — GitHub emails you on failure).

## 7 · Dashboard (optional, manual deploy)

`packages/dashboard` is an Astro 5 static site. Deploy:

1. Vercel → New project → import this repo → Root directory: `packages/dashboard`.
2. Environment Variables: paste `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
3. Deploy. Astro builds at request time / scheduled rebuild.

For live data without rebuilding: switch `output: 'static'` to `output: 'server'` in `astro.config.mjs` and add `@astrojs/vercel`.

## 8 · Day-2 ops

| Symptom | First check |
|---|---|
| Workflow red | Actions → click failed run → expand the failing step |
| OLX `partial` | `scrape_runs.errors` JSON — usually rate limit or specific query 4xx |
| eBay `partial` with 401 | OAuth token leaked / app key revoked — rotate in eBay portal |
| Empty top_demand_30d | Catalog sync didn't ingest — check `catalog_sku` row count |
| Discord silent | `digest-discord` log — needs ≥1 row with `STOCK`/`RAISE`/`LIQUIDATE` to post |
