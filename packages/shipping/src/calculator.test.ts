import { describe, expect, it } from 'vitest';
import { findRate, quotesFor } from './calculator.js';
import type { ShippingRate, Kit } from './types.js';

const RATES: ShippingRate[] = [
  { carrier: 'CTT', service: 'economy', origin: 'PT', destination: 'FR', weight_max_kg: 0.5, price_eur: 10, delivery_days_min: 5, delivery_days_max: 8, confidence: 'approximate' },
  { carrier: 'CTT', service: 'economy', origin: 'PT', destination: 'FR', weight_max_kg: 1, price_eur: 13, delivery_days_min: 5, delivery_days_max: 8, confidence: 'approximate' },
  { carrier: 'InPost', service: 'economy', origin: 'PT', destination: 'FR', weight_max_kg: 1, price_eur: 9, delivery_days_min: 4, delivery_days_max: 6, confidence: 'approximate' },
];

const KIDS_KIT: Kit = { type: 'kids', base_price_eur: 18, weight_kg: 0.4 };
const ADULT_KIT: Kit = { type: 'adult', base_price_eur: 19, weight_kg: 0.7 };

describe('findRate', () => {
  it('returns the smallest bucket ≥ kit weight', () => {
    const r = findRate(RATES, { carrier: 'CTT', destination: 'FR', weight_kg: 0.4 });
    expect(r?.weight_max_kg).toBe(0.5);
    expect(r?.price_eur).toBe(10);
  });

  it('jumps to the next bucket when kit weight exceeds the small one', () => {
    const r = findRate(RATES, { carrier: 'CTT', destination: 'FR', weight_kg: 0.7 });
    expect(r?.weight_max_kg).toBe(1);
    expect(r?.price_eur).toBe(13);
  });

  it('returns undefined when no bucket covers the weight', () => {
    const r = findRate(RATES, { carrier: 'CTT', destination: 'FR', weight_kg: 5 });
    expect(r).toBeUndefined();
  });
});

describe('quotesFor', () => {
  it('returns one quote per carrier+service for a destination, sorted cheapest first', () => {
    const quotes = quotesFor(RATES, ADULT_KIT, 'FR');
    expect(quotes).toHaveLength(2);
    expect(quotes[0]!.rate.carrier).toBe('InPost');
    expect(quotes[0]!.total_listing_price_eur).toBe(28);
    expect(quotes[1]!.rate.carrier).toBe('CTT');
    expect(quotes[1]!.total_listing_price_eur).toBe(32);
  });

  it('picks the smallest matching weight bucket for the kit', () => {
    const quotes = quotesFor(RATES, KIDS_KIT, 'FR');
    const ctt = quotes.find((q) => q.rate.carrier === 'CTT');
    expect(ctt?.rate.weight_max_kg).toBe(0.5);
    expect(ctt?.total_listing_price_eur).toBe(28); // 18 + 10
  });

  it('returns empty array when no carrier covers the destination', () => {
    const quotes = quotesFor(RATES, ADULT_KIT, 'GB');
    expect(quotes).toEqual([]);
  });
});
