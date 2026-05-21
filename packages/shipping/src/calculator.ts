import type { Carrier, Country, Kit, Quote, ShippingRate } from './types.js';

/**
 * Return the matching rate for a given (carrier, country, weight),
 * choosing the smallest weight bucket whose limit is ≥ kit weight.
 */
export function findRate(
  rates: ShippingRate[],
  filter: { carrier: Carrier; destination: Country; weight_kg: number; service?: ShippingRate['service'] },
): ShippingRate | undefined {
  const candidates = rates
    .filter(
      (r) =>
        r.carrier === filter.carrier &&
        r.destination === filter.destination &&
        r.weight_max_kg >= filter.weight_kg &&
        (filter.service === undefined || r.service === filter.service),
    )
    .sort((a, b) => a.weight_max_kg - b.weight_max_kg);
  return candidates[0];
}

/** Return all viable rates for (kit + destination), one per carrier+service. */
export function quotesFor(
  rates: ShippingRate[],
  kit: Kit,
  destination: Country,
): Quote[] {
  const out: Quote[] = [];
  const byCarrierService = new Map<string, ShippingRate>();

  for (const r of rates) {
    if (r.destination !== destination) continue;
    if (r.weight_max_kg < kit.weight_kg) continue;
    const key = `${r.carrier}|${r.service}`;
    const existing = byCarrierService.get(key);
    // Keep the smallest matching bucket per carrier+service combo
    if (!existing || r.weight_max_kg < existing.weight_max_kg) {
      byCarrierService.set(key, r);
    }
  }

  for (const rate of byCarrierService.values()) {
    out.push({
      rate,
      base_price_eur: kit.base_price_eur,
      shipping_eur: rate.price_eur,
      total_listing_price_eur: round2(kit.base_price_eur + rate.price_eur),
    });
  }

  // Sort cheapest first
  out.sort((a, b) => a.total_listing_price_eur - b.total_listing_price_eur);
  return out;
}

/** Group quotes for a kit across all destinations. */
export function quotesByDestination(
  rates: ShippingRate[],
  kit: Kit,
  destinations: Country[],
): Map<Country, Quote[]> {
  const out = new Map<Country, Quote[]>();
  for (const dest of destinations) {
    out.set(dest, quotesFor(rates, kit, dest));
  }
  return out;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
