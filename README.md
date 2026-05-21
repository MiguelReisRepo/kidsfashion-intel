# kidsfashion-intel

Marketplace intelligence for [KidsFashionClub](https://github.com/MiguelReisRepo/KidsFashionClub) — produces stocking recommendations and ad-targeting signals by monitoring listings and sales of similar products (football jerseys, NBA merch) across multiple marketplaces.

Companion service to the storefront; runs as a separate repo because the storefront is static (Astro SSG) and this service needs DB + cron + secrets.

## Scope

- **9 active sources:** eBay API, AliExpress API, Amazon PA-API, Mercado Livre API, OLX.pt, Depop, Grailed, Custojusto, Catawiki
- **4 deferred sources** (Datadome-protected, require paid proxies): Vinted, Wallapop, Leboncoin, Subito
- **Catalog monitored:** 232 SKUs / 127 unique `(team, season, kit_type)` combos
- **Cost target:** 0 €/month recurring

Full architecture in [`../kidsfashion-intel-masterplan.md`](../kidsfashion-intel-masterplan.md).

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
  scrapers/     one module per source
  ingest/       Supabase Edge Function — receives raw payloads
  normalizer/   match listings against catalog_sku
  metrics/      SQL + rollup jobs
  alerts/       Discord webhook triggers
  dashboard/    Astro app
db/             schema, migrations, source seed
.github/workflows/  one workflow per source + normalize/metrics/alerts crons
docs/           ADRs and source specs
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
