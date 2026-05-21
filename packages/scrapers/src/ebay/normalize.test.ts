import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { EbaySearchResponse } from './types.js';
import { normalizeEbayItem } from './normalize.js';
import { parseSeason } from '../lib/season.js';
import { detectKitType } from '../lib/kit-type.js';
import { detectGenderAge } from '../lib/audience.js';

const FIXTURE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'test', 'fixtures');
const NOW = '2026-05-21T12:00:00.000Z';

async function loadFixture(name: string): Promise<unknown> {
  const raw = await readFile(resolve(FIXTURE_DIR, name), 'utf-8');
  return JSON.parse(raw);
}

describe('parseSeason', () => {
  it.each([
    ['Benfica 2024/25 home jersey', '2024/25'],
    ['Sporting 2024-2025 away', '2024/25'],
    ['Retro 24/25 special', '2024/25'],
    ['Kit 2026', '2026'],
  ])('parses %s → %s', (input, expected) => {
    expect(parseSeason(input)).toBe(expected);
  });

  it('returns undefined for no season', () => {
    expect(parseSeason('Random jersey description')).toBeUndefined();
  });
});

describe('detectKitType', () => {
  it.each([
    ['Benfica Home Kids 2024/25', 'home'],
    ['Sporting CP Away M', 'away'],
    ['Real Madrid Third 2024-25', 'third'],
    ['Goalkeeper jersey Lisbon', 'goalkeeper'],
    ['Vintage retro 2008', 'retro'],
    ['Training Camp jersey', 'training'],
    ['Camisola Adepto Edição Limitada', 'special'],
  ])('detects %s → %s', (text, expected) => {
    expect(detectKitType(text)).toBe(expected);
  });
});

describe('detectGenderAge', () => {
  it.each([
    ['Benfica Home Kids 8 anos', 'kids'],
    ['Sporting Youth Junior 12-13', 'kids'],
    ['Camisola Criança 10', 'kids'],
    ['Adult M XL', 'adult'],
  ])('detects %s → %s', (text, expected) => {
    expect(detectGenderAge(text)).toBe(expected);
  });
});

describe('normalizeEbayItem (fixture-based)', () => {
  it('normalizes a real-shaped Benfica kids listing', async () => {
    const fixture = EbaySearchResponse.parse(await loadFixture('ebay-benfica-kids.json'));
    const item = fixture.itemSummaries?.[0];
    expect(item).toBeDefined();
    if (!item) return;

    const listing = await normalizeEbayItem(item, NOW, 'benfica');

    expect(listing.source).toBe('ebay');
    expect(listing.external_id).toBe('v1|123456789012|0');
    expect(listing.team_slug).toBe('benfica');
    expect(listing.season).toBe('2024/25');
    expect(listing.kit_type).toBe('home');
    expect(listing.gender_age).toBe('kids');
    expect(listing.condition).toBe('new');
    expect(listing.price_value).toBe(44.95);
    expect(listing.price_currency).toBe('EUR');
    expect(listing.price_eur).toBe(44.95);
    expect(listing.shipping_eur).toBe(5.5);
    expect(listing.country).toBe('PT');
    expect(listing.city).toBe('Lisboa');
    expect(listing.photos.length).toBeGreaterThan(0);
    expect(listing.seller_id).toBeDefined();
    expect(listing.seller_id?.length).toBe(32);
    expect(listing.match_confidence).toBe(0);
  });

  it('normalizes Sporting away adult Portuguese-language listing', async () => {
    const fixture = EbaySearchResponse.parse(await loadFixture('ebay-benfica-kids.json'));
    const item = fixture.itemSummaries?.[1];
    if (!item) throw new Error('fixture missing');
    const listing = await normalizeEbayItem(item, NOW, 'sporting');
    expect(listing.team_slug).toBe('sporting');
    expect(listing.kit_type).toBe('away');
    expect(listing.gender_age).toBe('adult');
    expect(listing.condition).toBe('good');
    expect(listing.season).toBe('2024/25');
  });

  it('converts USD to EUR via ECB FX', async () => {
    const fixture = EbaySearchResponse.parse(await loadFixture('ebay-benfica-kids.json'));
    const item = fixture.itemSummaries?.[2];
    if (!item) throw new Error('fixture missing');
    const listing = await normalizeEbayItem(item, NOW);
    expect(listing.price_currency).toBe('USD');
    expect(listing.price_value).toBe(59);
    // EUR result depends on live ECB rate; should be roughly half to fully of USD value
    expect(listing.price_eur).toBeGreaterThan(30);
    expect(listing.price_eur).toBeLessThan(75);
    expect(listing.kit_type).toBe('retro');
  });

  it('handles missing optional fields gracefully', async () => {
    const minimal = {
      itemId: 'v1|111|0',
      title: 'Generic football jersey',
      price: { value: '15.00', currency: 'EUR' },
      itemWebUrl: 'https://www.ebay.com/itm/111',
    };
    const parsed = EbaySearchResponse.parse({ itemSummaries: [minimal] });
    const item = parsed.itemSummaries?.[0];
    if (!item) throw new Error('parse failed');
    const listing = await normalizeEbayItem(item, NOW);
    expect(listing.season).toBeUndefined();
    expect(listing.kit_type).toBeUndefined();
    expect(listing.gender_age).toBeUndefined();
    expect(listing.condition).toBeUndefined();
    expect(listing.photos).toEqual([]);
  });
});
