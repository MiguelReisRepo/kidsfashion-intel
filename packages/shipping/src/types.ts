import { z } from 'zod';

export const Country = z.enum([
  'PT', // origin / domestic
  'ES',
  'FR',
  'IT',
  'DE',
  'NL',
  'BE',
  'LU',
  'AT',
  'IE',
  'PL',
  'GB',
  'CH',
]);
export type Country = z.infer<typeof Country>;

export const Carrier = z.enum([
  'CTT',
  'Chronopost',
  'DHL',
  'UPS',
  'InPost',
  'DPD',
  'GLS',
]);
export type Carrier = z.infer<typeof Carrier>;

export const Service = z.enum(['economy', 'standard', 'express']);
export type Service = z.infer<typeof Service>;

/**
 * Confidence label on a rate cell. Be honest with the user about which numbers
 * are guesses vs. verified.
 *
 * - 'verified'    — pulled from the carrier's official 2026 rate card by the owner
 * - 'approximate' — best-effort estimate based on public 2024-2025 data; review before listing
 * - 'placeholder' — admittedly a guess; do not rely on it for real listings
 */
export const RateConfidence = z.enum(['verified', 'approximate', 'placeholder']);
export type RateConfidence = z.infer<typeof RateConfidence>;

export const ShippingRate = z.object({
  carrier: Carrier,
  service: Service,
  origin: Country.default('PT'),
  destination: Country,
  weight_max_kg: z.number().positive(),
  price_eur: z.number().nonnegative(),
  delivery_days_min: z.number().int().nonnegative(),
  delivery_days_max: z.number().int().nonnegative(),
  confidence: RateConfidence,
  notes: z.string().optional(),
});
export type ShippingRate = z.infer<typeof ShippingRate>;

export const Kit = z.object({
  type: z.enum(['kids', 'adult']),
  base_price_eur: z.number().positive(),
  weight_kg: z.number().positive(),
});
export type Kit = z.infer<typeof Kit>;

export interface Quote {
  rate: ShippingRate;
  base_price_eur: number;
  shipping_eur: number;
  total_listing_price_eur: number;
}
