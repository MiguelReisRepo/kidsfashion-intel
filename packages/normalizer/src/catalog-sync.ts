import { transform } from 'esbuild';
import type { z } from 'zod';
import {
  type CatalogSku,
  type GenderAge,
  loadEnv,
  logger,
  ProductSeed,
} from '@kfi/shared';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { teamSlug, teamAliases } from './team-slug.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT_DIR = resolve(REPO_ROOT, 'data');

type SeedModule = { products?: unknown };

/**
 * Fetch KidsFashionClub seed.ts, transpile TS → JS in-memory via esbuild,
 * import via data: URL, return the products array (validated with Zod).
 */
async function fetchAndParseSeed(url: string): Promise<unknown[]> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch seed: ${res.status} ${res.statusText} from ${url}`);
  }
  const tsSource = await res.text();

  // Strip the runtime side-effect of the './types' import (it's type-only but
  // esbuild's `loader: 'ts'` correctly erases `import type {...}`). We also drop
  // any non-type imports to a relative path — those won't resolve at runtime.
  const sanitized = tsSource.replace(
    /^\s*import\s+(?!type)[^;]*from\s+['"]\.[^'"]+['"];?\s*$/gm,
    '',
  );

  const { code } = await transform(sanitized, { loader: 'ts', format: 'esm' });
  const dataUrl = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
  const mod = (await import(dataUrl)) as SeedModule;

  if (!Array.isArray(mod.products)) {
    throw new Error('seed.ts has no exported `products` array');
  }
  return mod.products as unknown[];
}

const AudienceToGenderAge: Record<'kids' | 'adult', GenderAge> = {
  kids: 'kids',
  adult: 'adult',
};

function mapProductToSku(
  product: z.infer<typeof ProductSeed>,
  sourceCommit: string | undefined,
): Omit<CatalogSku, 'id'> {
  const slug = teamSlug(product.team);
  return {
    external_id: product.id,
    slug: product.slug,
    name_pt: product.name.pt,
    name_en: product.name.en,
    team_slug: slug,
    team_display: product.team,
    season: product.season,
    kit_type: product.kitType,
    version: product.version,
    gender_age: AudienceToGenderAge[product.audience],
    sizes: product.sizes,
    retail_price_eur: product.price,
    in_stock: product.availability === 'in_stock',
    is_featured: product.isFeatured ?? false,
    is_clearance: product.isClearance ?? false,
    ...(sourceCommit ? { source_commit: sourceCommit } : {}),
  };
}

async function resolveLatestCommit(): Promise<string | undefined> {
  try {
    const res = await fetch(
      'https://api.github.com/repos/MiguelReisRepo/KidsFashionClub/commits?path=src/data/seed.ts&per_page=1',
      { headers: { 'User-Agent': 'kidsfashion-intel' } },
    );
    if (!res.ok) return undefined;
    const arr = (await res.json()) as Array<{ sha?: string }>;
    return arr[0]?.sha;
  } catch {
    return undefined;
  }
}

async function main(): Promise<void> {
  const env = loadEnv();
  const seedUrl = env.KIDSFASHION_SEED_URL;

  logger.info({ seedUrl }, 'Fetching seed.ts');
  const rawProducts = await fetchAndParseSeed(seedUrl);
  logger.info({ count: rawProducts.length }, 'Raw products extracted');

  const sourceCommit = await resolveLatestCommit();
  if (sourceCommit) {
    logger.info({ sha: sourceCommit.slice(0, 7) }, 'Resolved latest seed.ts commit');
  }

  const validated: z.infer<typeof ProductSeed>[] = [];
  const invalid: Array<{ index: number; id: unknown; error: string }> = [];

  for (let i = 0; i < rawProducts.length; i++) {
    const parsed = ProductSeed.safeParse(rawProducts[i]);
    if (parsed.success) {
      validated.push(parsed.data);
    } else {
      const raw = rawProducts[i] as { id?: unknown };
      invalid.push({
        index: i,
        id: raw?.id,
        error: parsed.error.issues.map((iss) => `${iss.path.join('.')}: ${iss.message}`).join('; '),
      });
    }
  }

  logger.info(
    { valid: validated.length, invalid: invalid.length },
    'Validation complete',
  );

  if (invalid.length > 0) {
    logger.warn({ samples: invalid.slice(0, 5) }, 'Invalid product entries (first 5)');
  }

  const skus = validated.map((p) => mapProductToSku(p, sourceCommit));

  // Build team_aliases — one alias per unique (lowercased team string)
  // plus any explicit aliases we know map to the same slug.
  const aliasMap = new Map<string, string>();
  const teamsSeen = new Set<string>();
  for (const sku of skus) {
    if (teamsSeen.has(sku.team_display)) continue;
    teamsSeen.add(sku.team_display);
    for (const alias of teamAliases(sku.team_display, sku.team_slug)) {
      aliasMap.set(alias, sku.team_slug);
    }
  }
  const aliases = [...aliasMap.entries()].map(([alias, team_slug]) => ({
    alias,
    team_slug,
    source: 'derived',
  }));

  // Distinct combos for sanity check vs masterplan figure (127)
  const combos = new Set(
    skus.map((s) => `${s.team_slug}|${s.season}|${s.kit_type}`),
  );

  const summary = {
    fetchedAt: new Date().toISOString(),
    sourceUrl: seedUrl,
    sourceCommit: sourceCommit ?? null,
    counts: {
      raw: rawProducts.length,
      valid: validated.length,
      invalid: invalid.length,
      teams: teamsSeen.size,
      aliases: aliases.length,
      uniqueCombos: combos.size,
    },
    invalidSamples: invalid.slice(0, 10),
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(resolve(OUT_DIR, 'catalog.json'), JSON.stringify(skus, null, 2));
  await writeFile(resolve(OUT_DIR, 'team-aliases.json'), JSON.stringify(aliases, null, 2));
  await writeFile(resolve(OUT_DIR, 'catalog-sync-summary.json'), JSON.stringify(summary, null, 2));

  logger.info(summary, 'catalog-sync complete');
}

main().catch((err: unknown) => {
  logger.fatal({ err }, 'catalog-sync failed');
  process.exitCode = 1;
});
