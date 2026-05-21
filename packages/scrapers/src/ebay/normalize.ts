import { createHash } from 'node:crypto';
import { type Listing, toEur } from '@kfi/shared';
import { teamSlug } from '@kfi/normalizer';
import type { EbayItemSummary } from './types.js';
import { parseSeason } from '../lib/season.js';
import { detectKitType } from '../lib/kit-type.js';
import { detectGenderAge } from '../lib/audience.js';
import { normalizeCondition } from '../lib/condition.js';

const SELLER_HASH_SALT = 'kfi-seller-v1';

function hashSeller(username: string | undefined): string | undefined {
  if (!username) return undefined;
  return createHash('sha256').update(`${SELLER_HASH_SALT}:${username}`).digest('hex').slice(0, 32);
}

function extractPhotos(item: EbayItemSummary): string[] {
  const out: string[] = [];
  if (item.image?.imageUrl) out.push(item.image.imageUrl);
  for (const t of item.thumbnailImages ?? []) {
    if (t.imageUrl) out.push(t.imageUrl);
  }
  for (const a of item.additionalImages ?? []) {
    if (a.imageUrl) out.push(a.imageUrl);
  }
  return [...new Set(out)];
}

function extractShipping(item: EbayItemSummary): number | undefined {
  const first = item.shippingOptions?.[0]?.shippingCost;
  if (!first) return undefined;
  const v = Number.parseFloat(first.value);
  if (!Number.isFinite(v) || v < 0) return undefined;
  return v;
}

/**
 * Map an eBay Browse API item summary into our canonical Listing schema.
 * `nowIso` and `teamSlugFromQuery` are inputs so this function stays pure & testable.
 */
export async function normalizeEbayItem(
  item: EbayItemSummary,
  nowIso: string,
  teamSlugHint?: string,
): Promise<Listing> {
  const title = item.title;
  const season = parseSeason(title);
  const kit_type = detectKitType(title);
  const gender_age = detectGenderAge(title);
  const condition = normalizeCondition(item.condition);

  const price_value = Number.parseFloat(item.price.value);
  const currency = item.price.currency.toUpperCase();
  const price_eur = await toEur(price_value, currency);
  const shipping_value = extractShipping(item);
  const shipping_eur =
    shipping_value === undefined
      ? undefined
      : await toEur(shipping_value, item.shippingOptions?.[0]?.shippingCost?.currency ?? currency);

  const inferredTeam = teamSlugHint ?? teamSlug(title.split(/\s+/).slice(0, 4).join(' '));

  const sellerHash = hashSeller(item.seller?.username);
  const sellerRating = item.seller?.feedbackPercentage
    ? Number.parseFloat(item.seller.feedbackPercentage) / 20 // 0-100 % → 0-5 scale
    : undefined;

  const listing: Listing = {
    external_id: item.itemId,
    source: 'ebay',
    url: item.itemWebUrl,
    title_raw: title,
    sizes: [],
    price_value,
    price_currency: currency,
    price_eur,
    photos: extractPhotos(item),
    first_seen_at: nowIso,
    last_seen_at: nowIso,
    match_confidence: 0, // computed downstream by match.ts
    ...(season ? { season } : {}),
    ...(kit_type ? { kit_type } : {}),
    ...(gender_age ? { gender_age } : {}),
    ...(condition ? { condition } : {}),
    ...(inferredTeam ? { team_slug: inferredTeam } : {}),
    ...(item.itemLocation?.country ? { country: item.itemLocation.country } : {}),
    ...(item.itemLocation?.city ? { city: item.itemLocation.city } : {}),
    ...(sellerHash ? { seller_id: sellerHash } : {}),
    ...(sellerRating !== undefined && Number.isFinite(sellerRating)
      ? { seller_rating: sellerRating }
      : {}),
    ...(item.itemCreationDate ? { listed_at: item.itemCreationDate } : {}),
    ...(shipping_eur !== undefined ? { shipping_eur } : {}),
  };
  return listing;
}
