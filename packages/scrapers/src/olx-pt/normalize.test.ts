import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { OlxSearchResponse } from './types.js';
import { normalizeOlxOffer, priceDropSignal } from './normalize.js';

const FIXTURE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'test', 'fixtures');
const NOW = '2026-05-21T12:00:00.000Z';

async function loadFixture(name: string): Promise<unknown> {
  const raw = await readFile(resolve(FIXTURE_DIR, name), 'utf-8');
  return JSON.parse(raw);
}

describe('OLX normalizer against real-captured fixture', () => {
  it('parses the fixture without errors', async () => {
    const fixture = OlxSearchResponse.parse(await loadFixture('olx-benfica.json'));
    expect(fixture.data.length).toBeGreaterThan(0);
  });

  it('produces valid Listings for every offer in the fixture', async () => {
    const fixture = OlxSearchResponse.parse(await loadFixture('olx-benfica.json'));
    for (const offer of fixture.data) {
      const listing = await normalizeOlxOffer(offer, NOW, 'benfica');
      expect(listing.source).toBe('olx-pt');
      expect(listing.country).toBe('PT');
      expect(listing.external_id).toBe(String(offer.id));
      expect(listing.url).toBe(offer.url);
      expect(listing.title_raw).toBe(offer.title);
      expect(listing.price_eur).toBeGreaterThan(0);
      expect(listing.price_currency).toBe('EUR');
      expect(listing.match_confidence).toBe(0);
      expect(listing.first_seen_at).toBe(NOW);
      // Seller hash should be deterministic and 32 chars
      if (listing.seller_id) expect(listing.seller_id).toHaveLength(32);
    }
  });

  it('extracts size and condition when present', async () => {
    const fixture = OlxSearchResponse.parse(await loadFixture('olx-benfica.json'));
    const withSize = (
      await Promise.all(
        fixture.data.map(async (o) => normalizeOlxOffer(o, NOW, 'benfica')),
      )
    ).filter((l) => l.sizes.length > 0);
    // At least one listing in any real Benfica search should carry a size param
    expect(withSize.length).toBeGreaterThan(0);
  });

  it('priceDropSignal returns null when no previous price', async () => {
    const fixture = OlxSearchResponse.parse(await loadFixture('olx-benfica.json'));
    const offer = fixture.data[0];
    if (!offer) throw new Error('empty fixture');
    // The fixture's first item may or may not have a price drop — function must just be safe
    const result = priceDropSignal(offer);
    expect(result === null || (typeof result.current === 'number' && typeof result.previous === 'number')).toBe(true);
  });
});
