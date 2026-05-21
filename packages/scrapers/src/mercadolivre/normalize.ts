import type { Condition, Listing } from '@kfi/shared';
import { detectGenderAge } from '../lib/audience.js';
import { detectKitType } from '../lib/kit-type.js';
import { parseSeason } from '../lib/season.js';
import type { MlItem } from './types.js';

const ML_CONDITION: Record<string, Condition> = {
  new: 'new',
  used: 'good',
  not_specified: 'good',
};

/**
 * Mercado Livre prices are in the site's local currency (BRL for MLB). The pipeline
 * converts to EUR downstream via the daily fx_rates table; here we expose both the
 * raw value and a placeholder EUR conversion that gets overwritten on persist.
 */
export async function normalizeMlItem(
  item: MlItem,
  nowIso: string,
  expectedTeamSlug?: string,
): Promise<Listing> {
  const title = item.title;
  const audience = detectGenderAge(title);
  const kitType = detectKitType(title);
  const season = parseSeason(title);

  const photos =
    item.pictures?.map((p) => p.url) ??
    (item.thumbnail ? [item.thumbnail] : []);

  const condition: Condition | undefined = item.condition
    ? ML_CONDITION[item.condition] ?? 'good'
    : undefined;

  const city = item.address?.city_name;
  const state = item.address?.state_name;

  const listing: Listing = {
    external_id: item.id,
    source: 'mercadolivre',
    url: item.permalink,
    title_raw: title,

    sizes: [],
    price_value: item.price,
    price_currency: item.currency_id,
    // Placeholder — actual EUR conversion happens at persist time when fx_rates
    // is consulted. We pass the BRL/ARS/etc value through unchanged.
    price_eur: item.price,

    photos,
    match_confidence: expectedTeamSlug ? 0.6 : 0.3,

    first_seen_at: nowIso,
    last_seen_at: nowIso,
  };

  if (kitType) listing.kit_type = kitType;
  if (audience) listing.gender_age = audience;
  if (season) listing.season = season;
  if (condition) listing.condition = condition;
  if (expectedTeamSlug) listing.team_slug = expectedTeamSlug;

  // ML buyer-facing country is implied by site (MLB → BR). We don't set country
  // from address.state because that's the seller's state inside Brazil.
  if (city || state) listing.city = [city, state].filter(Boolean).join(', ');

  if (item.seller?.id !== undefined) listing.seller_id = String(item.seller.id);

  return listing;
}
