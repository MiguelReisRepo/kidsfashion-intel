import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { type Listing, loadEnv, logger, type SourceName } from '@kfi/shared';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const DATA_DIR = resolve(REPO_ROOT, 'data');

export type Mode = 'supabase' | 'file';

export interface RawPayload {
  source: SourceName;
  external_id: string;
  payload: unknown;
}

export interface ScrapeRunRecord {
  source: SourceName;
  started_at: string;
  ended_at: string;
  requests_made: number;
  listings_found: number;
  listings_new: number;
  errors: unknown[];
  status: 'ok' | 'partial' | 'blocked' | 'error';
}

let cachedClient: SupabaseClient | null = null;

function detectMode(): Mode {
  const env = loadEnv();
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) return 'supabase';
  return 'file';
}

function supabase(): SupabaseClient {
  if (cachedClient) return cachedClient;
  const env = loadEnv();
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase env not configured');
  }
  cachedClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  return cachedClient;
}

async function writeJson(filename: string, body: unknown): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(resolve(DATA_DIR, filename), JSON.stringify(body, null, 2));
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export async function persistRawListings(
  source: SourceName,
  raws: RawPayload[],
): Promise<{ mode: Mode; written: number }> {
  if (raws.length === 0) return { mode: detectMode(), written: 0 };
  const mode = detectMode();

  if (mode === 'supabase') {
    const sb = supabase();
    const sourceId = await resolveSourceId(source);
    const rows = raws.map((r) => ({
      source_id: sourceId,
      external_id: r.external_id,
      payload: r.payload,
    }));
    const { error } = await sb.from('listings_raw').insert(rows);
    if (error) throw new Error(`listings_raw insert failed: ${error.message}`);
    logger.info({ source, count: rows.length }, 'persisted raw listings to Supabase');
    return { mode, written: rows.length };
  }

  await writeJson(`listings-raw-${source}-${timestamp()}.json`, raws);
  logger.info({ source, count: raws.length }, 'wrote raw listings to data/');
  return { mode, written: raws.length };
}

export async function persistNormalizedListings(
  source: SourceName,
  listings: Listing[],
): Promise<{ mode: Mode; written: number }> {
  if (listings.length === 0) return { mode: detectMode(), written: 0 };
  const mode = detectMode();

  if (mode === 'supabase') {
    const sb = supabase();
    const sourceId = await resolveSourceId(source);
    const rows = listings.map((l) => ({
      source_id: sourceId,
      external_id: l.external_id,
      url: l.url,
      sku_id: l.sku_id ?? null,
      team_slug: l.team_slug ?? null,
      season: l.season ?? null,
      kit_type: l.kit_type ?? null,
      gender_age: l.gender_age ?? null,
      size: l.sizes[0] ?? null,
      condition: l.condition ?? null,
      price_eur: l.price_eur,
      price_original: l.price_value,
      currency: l.price_currency,
      shipping_eur: l.shipping_eur ?? null,
      country: l.country ?? null,
      brand: l.brand ?? null,
      seller_id_hash: l.seller_id ?? null,
      seller_rating: l.seller_rating ?? null,
      photos: l.photos,
      title_raw: l.title_raw,
      listed_at: l.listed_at ?? null,
      last_seen_at: l.last_seen_at,
      sold_at: l.sold_at ?? null,
      match_confidence: l.match_confidence,
    }));
    const { error } = await sb
      .from('listings_normalized')
      .upsert(rows, { onConflict: 'source_id,external_id' });
    if (error) throw new Error(`listings_normalized upsert failed: ${error.message}`);
    logger.info({ source, count: rows.length }, 'persisted normalized listings to Supabase');
    return { mode, written: rows.length };
  }

  await writeJson(`listings-normalized-${source}-${timestamp()}.json`, listings);
  logger.info({ source, count: listings.length }, 'wrote normalized listings to data/');
  return { mode, written: listings.length };
}

export async function recordScrapeRun(run: ScrapeRunRecord): Promise<void> {
  const mode = detectMode();
  if (mode === 'supabase') {
    const sb = supabase();
    const sourceId = await resolveSourceId(run.source);
    const { error } = await sb.from('scrape_runs').insert({
      source_id: sourceId,
      started_at: run.started_at,
      ended_at: run.ended_at,
      requests_made: run.requests_made,
      listings_found: run.listings_found,
      listings_new: run.listings_new,
      errors: run.errors,
      status: run.status,
    });
    if (error) throw new Error(`scrape_runs insert failed: ${error.message}`);
    return;
  }
  await writeJson(`scrape-run-${run.source}-${timestamp()}.json`, run);
}

const sourceIdCache = new Map<SourceName, number>();
async function resolveSourceId(name: SourceName): Promise<number> {
  const cached = sourceIdCache.get(name);
  if (cached !== undefined) return cached;
  const sb = supabase();
  const { data, error } = await sb
    .from('sources')
    .select('id')
    .eq('name', name)
    .single<{ id: number }>();
  if (error) throw new Error(`Source not registered: ${name} (${error.message})`);
  if (!data) throw new Error(`Source row missing: ${name}`);
  sourceIdCache.set(name, data.id);
  return data.id;
}

export function currentMode(): Mode {
  return detectMode();
}
