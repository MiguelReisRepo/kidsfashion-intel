import type { CatalogSku } from '@kfi/shared';

export interface CatalogQuery {
  q: string;
  expectedTeamSlug: string;
  expectedSeasons: string[];
  expectedKitTypes: string[];
}

/**
 * Build batched queries from the catalog: one query per unique (team_display, season).
 * Returns deduplicated query plans — many SKUs share team+season+kit, so this collapses
 * naturally from 127 SKUs to ~50–80 queries, which is the polite-scraping target.
 */
export function buildCatalogQueries(catalog: CatalogSku[]): CatalogQuery[] {
  const byTeamSeason = new Map<
    string,
    { team_display: string; team_slug: string; season: string; kits: Set<string> }
  >();

  for (const sku of catalog) {
    const key = `${sku.team_slug}|${sku.season}`;
    let entry = byTeamSeason.get(key);
    if (!entry) {
      entry = {
        team_display: sku.team_display,
        team_slug: sku.team_slug,
        season: sku.season,
        kits: new Set(),
      };
      byTeamSeason.set(key, entry);
    }
    entry.kits.add(sku.kit_type);
  }

  const queries: CatalogQuery[] = [];
  for (const entry of byTeamSeason.values()) {
    // Base query is team + season. Each source adapter adds its own keyword
    // suffix (eBay benefits from multi-lang widening, OLX search prefers terse PT input).
    const q = `${entry.team_display} ${entry.season}`;
    queries.push({
      q,
      expectedTeamSlug: entry.team_slug,
      expectedSeasons: [entry.season],
      expectedKitTypes: [...entry.kits],
    });
  }

  return queries;
}
