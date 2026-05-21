import { createHash } from 'node:crypto';
import { type Condition, type Listing, toEur } from '@kfi/shared';
import { teamSlug } from '@kfi/normalizer';
import type { OlxOffer, OlxPriceValue, OlxSelectValue } from './types.js';
import { parseSeason } from '../lib/season.js';
import { detectKitType } from '../lib/kit-type.js';
import { detectGenderAge } from '../lib/audience.js';

const SELLER_HASH_SALT = 'kfi-seller-v1';

function hashSeller(input: string | undefined): string | undefined {
  if (!input) return undefined;
  return createHash('sha256').update(`${SELLER_HASH_SALT}:${input}`).digest('hex').slice(0, 32);
}

function findParam<T>(offer: OlxOffer, key: string): T | undefined {
  const p = offer.params.find((x) => x.key === key);
  return p?.value as T | undefined;
}

const CONDITION_MAP: Record<string, Condition> = {
  new: 'new',
  used: 'good',
  damaged: 'fair',
  refurbished: 'like_new',
};

function decodeCondition(offer: OlxOffer): Condition | undefined {
  const v = findParam<OlxSelectValue>(offer, 'state');
  if (!v) return undefined;
  return CONDITION_MAP[v.key.toLowerCase()];
}

function decodeSize(offer: OlxOffer): string | undefined {
  const v = findParam<OlxSelectValue>(offer, 'size');
  return v?.label;
}

function expandPhotoTemplate(link: string): string {
  // OLX photo URLs include {width}x{height} template; use 800x800
  return link.replace('{width}x{height}', '800x800');
}

/** Pure mapping fn — eBay/OLX produce the same Listing shape. */
export async function normalizeOlxOffer(
  offer: OlxOffer,
  nowIso: string,
  teamSlugHint?: string,
): Promise<Listing> {
  const titleAndDesc = `${offer.title} ${offer.description ?? ''}`;

  const priceVal = findParam<OlxPriceValue>(offer, 'price');
  const price_value = priceVal?.value ?? 0;
  const price_currency = (priceVal?.currency ?? 'EUR').toUpperCase();
  const price_eur = await toEur(price_value, price_currency);

  const condition = decodeCondition(offer);
  const size = decodeSize(offer);
  const season = parseSeason(titleAndDesc);
  const kit_type = detectKitType(titleAndDesc);
  const gender_age = detectGenderAge(titleAndDesc);
  const inferredTeam = teamSlugHint ?? teamSlug(offer.title.split(/\s+/).slice(0, 4).join(' '));
  const sellerHash = hashSeller(offer.user?.uuid ?? String(offer.user?.id ?? ''));

  const photos = offer.photos.map((p) => expandPhotoTemplate(p.link)).filter(Boolean);

  // OLX is exclusively PT marketplace; country is implicit
  const city = offer.location?.city?.name;

  const listing: Listing = {
    external_id: String(offer.id),
    source: 'olx-pt',
    url: offer.url,
    title_raw: offer.title,
    sizes: size ? [size] : [],
    price_value,
    price_currency,
    price_eur,
    photos,
    first_seen_at: nowIso,
    last_seen_at: nowIso,
    match_confidence: 0,
    country: 'PT',
    ...(offer.description ? { description: offer.description } : {}),
    ...(season ? { season } : {}),
    ...(kit_type ? { kit_type } : {}),
    ...(gender_age ? { gender_age } : {}),
    ...(condition ? { condition } : {}),
    ...(inferredTeam ? { team_slug: inferredTeam } : {}),
    ...(city ? { city } : {}),
    ...(sellerHash ? { seller_id: sellerHash } : {}),
    ...(offer.created_time ? { listed_at: offer.created_time } : {}),
  };
  return listing;
}

/** Surfaces price drop signal (OLX exposes previous_value directly). */
export function priceDropSignal(offer: OlxOffer): { current: number; previous: number } | null {
  const priceVal = findParam<OlxPriceValue>(offer, 'price');
  if (!priceVal?.previous_value || priceVal.previous_value <= priceVal.value) return null;
  return { current: priceVal.value, previous: priceVal.previous_value };
}
