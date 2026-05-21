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
import { buildCatalogQueries } from './lib/queries.js';

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

async function runEbay(opts: RunnerOptions): Promise<void> {
  loadEnv();
  const mode = currentMode();
  logger.info({ mode, dryRun: opts.dryRun }, 'eBay runner starting');

  const catalog = await loadCatalog();
  const queries = buildCatalogQueries(catalog as Parameters<typeof buildCatalogQueries>[0]);
  const queriesToRun = opts.limit ? queries.slice(0, opts.limit) : queries;
  logger.info(
    { totalQueries: queries.length, running: queriesToRun.length },
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
      const res = await searchEbay({ q: query.q, limit: 50 });
      requests++;
      const items = res.itemSummaries ?? [];
      logger.info(
        { q: query.q, found: items.length, total: res.total ?? null },
        'eBay search ok',
      );

      const now = new Date().toISOString();
      for (const item of items) {
        rawAccumulator.push({
          source: 'ebay',
          external_id: item.itemId,
          payload: item,
        });
        try {
          const listing = await normalizeEbayItem(item, now, query.expectedTeamSlug);
          normalizedAccumulator.push(listing);
        } catch (err) {
          errors.push({
            query: query.q,
            error: `normalize ${item.itemId}: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      }

      await sleep(opts.delayMs);
    } catch (err) {
      errors.push({
        query: query.q,
        error: err instanceof Error ? err.message : String(err),
      });
      logger.warn({ q: query.q, err }, 'eBay search failed');
    }
  }

  if (!opts.dryRun) {
    await persistRawListings('ebay', rawAccumulator);
    await persistNormalizedListings('ebay', normalizedAccumulator);
  }

  await recordScrapeRun({
    source: 'ebay',
    started_at: startedAt,
    ended_at: new Date().toISOString(),
    requests_made: requests,
    listings_found: rawAccumulator.length,
    listings_new: rawAccumulator.length,
    errors,
    status: errors.length === 0 ? 'ok' : errors.length < requests / 2 ? 'partial' : 'error',
  });

  logger.info(
    {
      requests,
      listings: rawAccumulator.length,
      errors: errors.length,
      mode,
    },
    'eBay runner finished',
  );
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  switch (opts.source) {
    case 'ebay':
      await runEbay(opts);
      break;
    default:
      throw new Error(`Source not implemented yet: ${opts.source}`);
  }
}

main().catch((err: unknown) => {
  logger.fatal({ err }, 'runner failed');
  process.exitCode = 1;
});
