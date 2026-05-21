import type { Condition, Listing } from '@kfi/shared';
import { detectGenderAge } from '../lib/audience.js';
import { detectKitType } from '../lib/kit-type.js';
import { parseSeason } from '../lib/season.js';
import type { VintedItem } from './types.js';

const VINTED_STATUS_CONDITION: Record<string, Condition> = {
  // status_id labels Vinted serves on the site:
  novo_com_etiqueta: 'new',
  novo_sem_etiqueta: 'new',
  muito_bom: 'like_new',
  bom: 'good',
  satisfatorio: 'fair',
};

function priceEur(item: VintedItem): { value: number; currency: string } | null {
  // Newer Vinted responses use total_item_price (includes Vinted's buyer fee).
  // For market signal we want the seller's listed amount, so prefer `price`.
  const p = item.price ?? item.total_item_price;
  if (!p) return null;
  return { value: p.amount, currency: p.currency_code };
}

export async function normalizeVintedItem(
  item: VintedItem,
  nowIso: string,
  expectedTeamSlug?: string,
): Promise<Listing> {
  const title = item.title;
  const audience = detectGenderAge(title);
  const kitType = detectKitType(title);
  const season = parseSeason(title);

  const price = priceEur(item);
  // Vinted is EUR-only across PT/ES/FR/IT/DE so the listed value is already EUR;
  // fall back to a 0 placeholder to avoid throwing on a malformed row.
  const priceValue = price?.value ?? 0;
  const priceCurrency = price?.currency ?? 'EUR';

  const listing: Listing = {
    external_id: String(item.id),
    source: 'vinted',
    url: item.url,
    title_raw: title,

    sizes: item.size_title ? [item.size_title] : [],
    price_value: priceValue,
    price_currency: priceCurrency,
    // EUR site, no FX needed.
    price_eur: priceCurrency === 'EUR' ? priceValue : priceValue,

    photos: item.photo?.full_size_url
      ? [item.photo.full_size_url]
      : item.photo?.url
        ? [item.photo.url]
        : [],
    match_confidence: expectedTeamSlug ? 0.7 : 0.4,

    first_seen_at: nowIso,
    last_seen_at: nowIso,
  };

  if (kitType) listing.kit_type = kitType;
  if (audience) listing.gender_age = audience;
  if (season) listing.season = season;
  if (item.brand_title) listing.brand = item.brand_title;
  if (expectedTeamSlug) listing.team_slug = expectedTeamSlug;
  if (item.country) listing.country = item.country.toUpperCase().slice(0, 2);
  if (item.city) listing.city = item.city;
  if (item.user?.id !== undefined) listing.seller_id = String(item.user.id);

  // Map Vinted's status label to our coarse condition enum when we can.
  if (item.status) {
    const key = item.status.toLowerCase().replace(/\s+/g, '_');
    const condition = VINTED_STATUS_CONDITION[key];
    if (condition) listing.condition = condition;
  }

  return listing;
}
