import type { CatalogSku, GenderAge } from '@kfi/shared';

export interface CatalogQuery {
  q: string;
  expectedTeamSlug: string;
  expectedSeasons: string[];
  expectedKitTypes: string[];
  /** kids / adult / unisex — drives source-specific category filters. */
  genderAge: GenderAge;
}

/**
 * Build batched queries from the catalog: one query per unique (team, season, gender_age).
 * Returns deduplicated query plans — many SKUs share that triple, so this collapses
 * naturally from 127 SKUs to ~80–120 queries, which is the polite-scraping target.
 *
 * Splitting on gender_age matters because marketplaces typically have different
 * category trees for kids vs adult apparel (e.g. OLX-PT cat 292 vs 5430) and the
 * scraper adapters need that signal to scope their requests.
 */
export function buildCatalogQueries(catalog: CatalogSku[]): CatalogQuery[] {
  const byKey = new Map<
    string,
    {
      team_display: string;
      team_slug: string;
      season: string;
      gender_age: GenderAge;
      kits: Set<string>;
    }
  >();

  for (const sku of catalog) {
    const key = `${sku.team_slug}|${sku.season}|${sku.gender_age}`;
    let entry = byKey.get(key);
    if (!entry) {
      entry = {
        team_display: sku.team_display,
        team_slug: sku.team_slug,
        season: sku.season,
        gender_age: sku.gender_age,
        kits: new Set(),
      };
      byKey.set(key, entry);
    }
    entry.kits.add(sku.kit_type);
  }

  const queries: CatalogQuery[] = [];
  for (const entry of byKey.values()) {
    // Base query is team + season. Each source adapter adds its own keyword
    // suffix (eBay benefits from multi-lang widening, OLX search prefers terse PT input).
    const q = `${entry.team_display} ${entry.season}`;
    queries.push({
      q,
      expectedTeamSlug: entry.team_slug,
      expectedSeasons: [entry.season],
      expectedKitTypes: [...entry.kits],
      genderAge: entry.gender_age,
    });
  }

  return queries;
}
