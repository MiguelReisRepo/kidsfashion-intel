import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { type Listing, loadEnv, logger, type SourceName } from '@kfi/shared';
import {
  currentMode,
  persistNormalizedListings,
  persistRawListings,
  recordScrapeRun,
} from '@kfi/db';
import { searchEbay } from './ebay/client.js';
import { normalizeEbayItem } from './ebay/normalize.js';
import { searchOlx } from './olx-pt/client.js';
import { normalizeOlxOffer } from './olx-pt/normalize.js';
import { searchMercadoLivre } from './mercadolivre/client.js';
import { normalizeMlItem } from './mercadolivre/normalize.js';
import { buildCatalogQueries, type CatalogQuery } from './lib/queries.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CATALOG_PATH = resolve(REPO_ROOT, 'data', 'catalog.json');

interface RunnerOptions {
  source: SourceName;
  dryRun: boolean;
  limit: number | undefined;
  delayMs: number;
}

function parseArgs(argv: string[]): RunnerOptions {
  const opts: RunnerOptions = {
    source: 'ebay',
    dryRun: false,
    limit: undefined,
    delayMs: 1500,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--source') {
      const next = argv[++i];
      if (!next) throw new Error('--source needs a value');
      opts.source = next as SourceName;
    } else if (arg === '--dry') {
      opts.dryRun = true;
    } else if (arg === '--limit') {
      const next = argv[++i];
      if (!next) throw new Error('--limit needs a value');
      opts.limit = Number.parseInt(next, 10);
    } else if (arg === '--delay-ms') {
      const next = argv[++i];
      if (!next) throw new Error('--delay-ms needs a value');
      opts.delayMs = Number.parseInt(next, 10);
    }
  }
  return opts;
}

async function loadCatalog(): Promise<unknown[]> {
  try {
    const raw = await readFile(CATALOG_PATH, 'utf-8');
    return JSON.parse(raw) as unknown[];
  } catch (err) {
    throw new Error(
      `Could not load catalog from ${CATALOG_PATH}. Run \`npm run catalog-sync -w @kfi/normalizer\` first. (${
        err instanceof Error ? err.message : String(err)
      })`,
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

interface SourceAdapter {
  searchOne(query: CatalogQuery, nowIso: string): Promise<{
    raws: { external_id: string; payload: unknown }[];
    listings: Listing[];
  }>;
  buildQuery(q: CatalogQuery): CatalogQuery;
}

const adapters: Record<string, SourceAdapter> = {
  ebay: {
    buildQuery: (q) => ({ ...q, q: `${q.q} jersey kit camisola` }),
    async searchOne(query, nowIso) {
      const res = await searchEbay({ q: query.q, limit: 50 });
      const items = res.itemSummaries ?? [];
      const raws = items.map((item) => ({
        external_id: item.itemId,
        payload: item,
      }));
      const listings = await Promise.all(
        items.map((item) => normalizeEbayItem(item, nowIso, query.expectedTeamSlug)),
      );
      return { raws, listings };
    },
  },
  'olx-pt': {
    buildQuery: (q) => q,
    async searchOne(query, nowIso) {
      // Empirically (spike-search-portugal-kids.mjs):
      //   cat 292  = /bebes-criancas/roupinhas/  (kids clothing, ~all kids items)
      //   cat 5430 = Camisolas e Equipamentos (broader sports apparel, adult-heavy)
      // Scoping the request by gender_age cuts noise and saves quota on the
      // shared 60 req/h budget for this source.
      const categoryId =
        query.genderAge === 'kids' ? 292
        : query.genderAge === 'adult' ? 5430
        : undefined;
      const params = { query: query.q, limit: 40 } as { query: string; limit: number; categoryId?: number };
      if (categoryId !== undefined) params.categoryId = categoryId;
      const res = await searchOlx(params);
      const offers = res.data;
      const raws = offers.map((o) => ({
        external_id: String(o.id),
        payload: o,
      }));
      const listings = await Promise.all(
        offers.map((o) => normalizeOlxOffer(o, nowIso, query.expectedTeamSlug)),
      );
      return { raws, listings };
    },
  },
  mercadolivre: {
    // BR site (MLB) gives Portuguese results and is most relevant for our Brazil-team SKUs
    // (Palmeiras, Flamengo, Corinthians, Brasil seleção). The kids category filter is not
    // applied here — ML's category tree is broad and noisy; we rely on title-based audience
    // detection in normalize.ts and post-filter at metrics rollup time.
    buildQuery: (q) => ({ ...q, q: `${q.q} infantil` }),
    async searchOne(query, nowIso) {
      const res = await searchMercadoLivre({ q: query.q, siteId: 'MLB', limit: 50 });
      const items = res.results;
      const raws = items.map((it) => ({ external_id: it.id, payload: it }));
      const listings = await Promise.all(
        items.map((it) => normalizeMlItem(it, nowIso, query.expectedTeamSlug)),
      );
      return { raws, listings };
    },
  },
};

async function runSource(opts: RunnerOptions): Promise<void> {
  loadEnv();
  const mode = currentMode();
  const adapter = adapters[opts.source];
  if (!adapter) throw new Error(`Source not implemented: ${opts.source}`);

  logger.info({ mode, source: opts.source, dryRun: opts.dryRun }, 'runner starting');

  const catalog = await loadCatalog();
  const baseQueries = buildCatalogQueries(catalog as Parameters<typeof buildCatalogQueries>[0]);
  const queries = baseQueries.map((q) => adapter.buildQuery(q));
  const queriesToRun = opts.limit ? queries.slice(0, opts.limit) : queries;
  logger.info(
    { totalQueries: queries.length, running: queriesToRun.length, source: opts.source },
    'Built catalog queries',
  );

  const startedAt = new Date().toISOString();
  const rawAccumulator: { source: SourceName; external_id: string; payload: unknown }[] = [];
  const normalizedAccumulator: Listing[] = [];
  const errors: { query: string; error: string }[] = [];
  let requests = 0;

  for (const query of queriesToRun) {
    if (opts.dryRun) {
      logger.info({ q: query.q }, '(dry) would search');
      continue;
    }
    try {
      const nowIso = new Date().toISOString();
      const { raws, listings } = await adapter.searchOne(query, nowIso);
      requests++;
      logger.info({ q: query.q, found: raws.length }, 'search ok');
      for (const r of raws) {
        rawAccumulator.push({ source: opts.source, external_id: r.external_id, payload: r.payload });
      }
      normalizedAccumulator.push(...listings);
    } catch (err) {
      errors.push({
        query: query.q,
        error: err instanceof Error ? err.message : String(err),
      });
      logger.warn({ q: query.q, err: err instanceof Error ? err.message : err }, 'search failed');
    }
    // Always sleep between iterations — both for politeness and to avoid bursting
    // a freshly-rate-limited source.
    await sleep(opts.delayMs);
  }

  if (!opts.dryRun) {
    await persistRawListings(opts.source, rawAccumulator);
    await persistNormalizedListings(opts.source, normalizedAccumulator);
  }

  await recordScrapeRun({
    source: opts.source,
    started_at: startedAt,
    ended_at: new Date().toISOString(),
    requests_made: requests,
    listings_found: rawAccumulator.length,
    listings_new: rawAccumulator.length,
    errors,
    status:
      errors.length === 0
        ? 'ok'
        : errors.length < Math.max(1, requests / 2)
          ? 'partial'
          : 'error',
  });

  logger.info(
    {
      source: opts.source,
      requests,
      listings: rawAccumulator.length,
      errors: errors.length,
      mode,
    },
    'runner finished',
  );
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  await runSource(opts);
}

main().catch((err: unknown) => {
  logger.fatal({ err }, 'runner failed');
  process.exitCode = 1;
});
