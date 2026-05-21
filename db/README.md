# Database setup

Target: **Supabase free tier** (500 MB Postgres, 2 GB egress). Schema is plain Postgres, so any other host works the same way — Hetzner self-host migration path is trivial.

## Files

- `schema.sql` — canonical schema, idempotent (`CREATE TABLE IF NOT EXISTS`)
- `migrations/` — versioned migrations, apply in numeric order
- `seed/sources.sql` — registers the 9 active marketplace sources

## Initial setup

1. Create a free project at https://supabase.com/dashboard
2. Settings → Database → copy the `URI` (transaction pooler) connection string
3. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` in your local `.env.local`
4. Apply schema and seed:

```bash
psql "$SUPABASE_DATABASE_URL" -f db/schema.sql
psql "$SUPABASE_DATABASE_URL" -f db/seed/sources.sql
```

Or via the Supabase SQL editor: paste each file's contents and run.

## Production secrets

For GitHub Actions cron jobs, store the same values as repository secrets under the **same names** (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). The workflows read from `secrets.*` and pass them as env vars to the scripts.

## Resetting

Schema uses `CREATE TABLE IF NOT EXISTS` so re-applying is safe. To wipe data without dropping structure:

```sql
TRUNCATE TABLE listings_raw, listings_normalized, price_snapshots, sold_signals,
               metrics_daily, scrape_runs, alerts_log RESTART IDENTITY CASCADE;
```

To wipe everything including catalog:

```sql
DROP TABLE IF EXISTS alerts_log, scrape_runs, metrics_daily, sold_signals,
                     price_snapshots, listings_normalized, listings_raw,
                     fx_rates, size_aliases, team_aliases, catalog_sku, sources CASCADE;
```

Then re-run `schema.sql` and `seed/sources.sql`.

## Disaster recovery

- Supabase free tier: point-in-time recovery 7 days
- Plus nightly `pg_dump` to GitHub Actions artifacts, encrypted with `age` (see `.github/workflows/backup.yml`)
