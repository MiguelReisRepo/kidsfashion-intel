import { describe, expect, it } from 'vitest';
import { KitType, SourceName, Listing } from './types.js';

describe('shared types', () => {
  it('SourceName parses valid value', () => {
    expect(SourceName.parse('ebay')).toBe('ebay');
  });

  it('SourceName rejects unknown source', () => {
    expect(() => SourceName.parse('facebook-marketplace')).toThrow();
  });

  it('KitType covers documented kit types', () => {
    expect(KitType.options).toContain('home');
    expect(KitType.options).toContain('retro');
    expect(KitType.options).toContain('goalkeeper');
  });

  it('Listing validates minimal valid shape', () => {
    const now = new Date().toISOString();
    const parsed = Listing.parse({
      external_id: 'ebay-123',
      source: 'ebay',
      url: 'https://www.ebay.com/itm/123',
      title_raw: 'Camisola Benfica 2024/25 Kids 8 anos',
      sizes: ['8'],
      price_value: 49.99,
      price_currency: 'EUR',
      price_eur: 49.99,
      photos: [],
      first_seen_at: now,
      last_seen_at: now,
      match_confidence: 0,
    });
    expect(parsed.source).toBe('ebay');
    expect(parsed.match_confidence).toBe(0);
  });
});
