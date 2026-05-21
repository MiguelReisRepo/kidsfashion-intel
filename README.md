# kidsfashion-intel

Marketplace intelligence for [KidsFashionClub](https://github.com/MiguelReisRepo/KidsFashionClub) — produces stocking recommendations and ad-targeting signals by monitoring listings and sales of similar products (football jerseys, NBA merch) across multiple marketplaces.

Companion service to the storefront; runs as a separate repo because the storefront is static (Astro SSG) and this service needs DB + cron + secrets.

## Scope

- **Catalog monitored:** 232 SKUs (~80–120 dedup `(team, season, gender_age)` queries)
- **Cost target:** 0 €/month recurring

### Sources

| Source | Type | Status | Notes |
|---|---|---|---|
| eBay Browse API | API | implemented + cron | hourly at :17 |
| OLX-PT | scrape (free fetch) | implemented + cron | every 4h at :43, kids → cat 292 |
| Mercado Livre | API | implemented + cron | every 6h at :29, MLB site, OAuth required |
| Vinted | scrape (session-cookie reuse) | implemented + cron | every 4h at :11, **self-hosted runner only** (see [VINTED_SELFHOSTED.md](./VINTED_SELFHOSTED.md)) |
| AliExpress | API | planned | open platform key not yet provisioned |
| Amazon PA-API | API | planned | low volume of jerseys, deprioritized |
| Catawiki | scrape | planned | minor volume, audited-listings only |
| Custojusto | scrape | deferred | Cloudflare bot wall returns 403 — needs paid residential proxy |
| Depop | scrape | deferred | requires browser automation |
| Grailed | scrape | deferred | resale-niche, low signal-to-effort |
| Wallapop, Leboncoin, Subito | scrape | deferred | Datadome-protected (paid proxies required) |

See [PRODUCTION.md](./PRODUCTION.md) for bring-up.

## Stack

- Node 22 + TypeScript 5
- npm workspaces (monorepo)
- Crawlee + Playwright (for scraped sources)
- Supabase Postgres (free tier)
- GitHub Actions (public repo, unlimited cron minutes)
- Astro 5 dashboard (deployed to Vercel free)
- Discord webhooks for alerts

## Layout

```
packages/
  shared/       types, env, logger, FX client
  scrapers/     one module per source (ebay, olx-pt, mercadolivre)
  normalizer/   catalog-sync from KidsFashionClub seed.ts + team-slug
  db/           Supabase client + persistence helpers
  metrics/      RPC-driven daily rollup (sold_signals + price_snapshots + metrics_daily)
  alerts/       Discord webhook digest from top_demand_30d
  shipping/     CTT/InPost rate calculator + standalone dashboard
  dashboard/    Astro 5 static dashboard (build-time fetch from Supabase)
db/             schema.sql, migrations, source seed
.github/workflows/  fetch-* per source + normalize-metrics + digest-discord
scripts/        ad-hoc spike scripts (see spike-search-portugal-kids.mjs)
```

## Development

```bash
nvm use            # node 22
npm install
cp .env.example .env.local   # fill credentials
npm run typecheck
npm test
```

## Secrets

All credentials live in `.env.local` (gitignored). Production secrets are stored in GitHub Actions repository secrets. Never commit `.env`, `.env.local`, or any file containing real keys.
