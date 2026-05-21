import type { ShippingRate } from './types.js';

/**
 * Default rate table (origin PT, package ≤1kg, S envelope/small box).
 *
 * IMPORTANT — these are APPROXIMATE based on public 2024-2025 rate cards.
 * Carriers change pricing yearly (often January) plus monthly fuel surcharges.
 * Before using these for real eBay listings, VERIFY each row against the
 * official rate card URLs in `carriers.ts`.
 *
 * Mark any row you confirm as 'verified' so the dashboard can flag what's safe.
 *
 * Weight buckets:
 *   - 0.5 kg → covers kids kits (shirt + shorts + packaging ≈ 350-450g)
 *   - 1.0 kg → covers adult kits (shirt + shorts/full kit + packaging ≈ 500-800g)
 *
 * For each (carrier, service, destination) we list one rate per weight bucket.
 * The calculator picks the smallest bucket whose limit ≥ kit weight.
 */
export const DEFAULT_RATES: ShippingRate[] = [
  // ============================================================
  // PT DOMÉSTICO (origem PT → destino PT)
  // ============================================================
  { carrier: 'CTT', service: 'economy', origin: 'PT', destination: 'PT', weight_max_kg: 0.5, price_eur: 2.50, delivery_days_min: 2, delivery_days_max: 4, confidence: 'approximate', notes: 'Correio Verde Nacional (não-prioritário)' },
  { carrier: 'CTT', service: 'economy', origin: 'PT', destination: 'PT', weight_max_kg: 1, price_eur: 3.30, delivery_days_min: 2, delivery_days_max: 4, confidence: 'approximate', notes: 'Correio Verde Nacional' },
  { carrier: 'CTT', service: 'standard', origin: 'PT', destination: 'PT', weight_max_kg: 0.5, price_eur: 4.20, delivery_days_min: 1, delivery_days_max: 2, confidence: 'approximate', notes: 'Correio Azul Nacional (prioritário)' },
  { carrier: 'CTT', service: 'standard', origin: 'PT', destination: 'PT', weight_max_kg: 1, price_eur: 5.50, delivery_days_min: 1, delivery_days_max: 2, confidence: 'approximate', notes: 'Correio Azul Nacional' },
  { carrier: 'InPost', service: 'economy', origin: 'PT', destination: 'PT', weight_max_kg: 1, price_eur: 2.99, delivery_days_min: 1, delivery_days_max: 2, confidence: 'approximate', notes: 'Locker-to-locker doméstico — mais barato em PT' },
  { carrier: 'InPost', service: 'standard', origin: 'PT', destination: 'PT', weight_max_kg: 1, price_eur: 3.99, delivery_days_min: 1, delivery_days_max: 1, confidence: 'approximate', notes: 'Locker → entrega ao domicílio' },
  { carrier: 'DPD', service: 'standard', origin: 'PT', destination: 'PT', weight_max_kg: 1, price_eur: 5.90, delivery_days_min: 1, delivery_days_max: 2, confidence: 'approximate', notes: 'DPD Classic Nacional' },
  { carrier: 'Chronopost', service: 'express', origin: 'PT', destination: 'PT', weight_max_kg: 1, price_eur: 8.50, delivery_days_min: 1, delivery_days_max: 1, confidence: 'approximate', notes: 'Chrono 13 doméstico — entrega manhã seguinte' },

  // ============================================================
  // CTT — Internacional Económico (lento, ~5-10 dias)
  // Public CTT 2024 zone-based pricing for parcels under 1kg
  // ============================================================
  { carrier: 'CTT', service: 'economy', origin: 'PT', destination: 'ES', weight_max_kg: 0.5, price_eur: 8.65, delivery_days_min: 4, delivery_days_max: 7, confidence: 'approximate' },
  { carrier: 'CTT', service: 'economy', origin: 'PT', destination: 'ES', weight_max_kg: 1, price_eur: 10.90, delivery_days_min: 4, delivery_days_max: 7, confidence: 'approximate' },
  { carrier: 'CTT', service: 'economy', origin: 'PT', destination: 'FR', weight_max_kg: 0.5, price_eur: 10.50, delivery_days_min: 5, delivery_days_max: 8, confidence: 'approximate' },
  { carrier: 'CTT', service: 'economy', origin: 'PT', destination: 'FR', weight_max_kg: 1, price_eur: 13.80, delivery_days_min: 5, delivery_days_max: 8, confidence: 'approximate' },
  { carrier: 'CTT', service: 'economy', origin: 'PT', destination: 'DE', weight_max_kg: 0.5, price_eur: 11.20, delivery_days_min: 5, delivery_days_max: 8, confidence: 'approximate' },
  { carrier: 'CTT', service: 'economy', origin: 'PT', destination: 'DE', weight_max_kg: 1, price_eur: 14.50, delivery_days_min: 5, delivery_days_max: 8, confidence: 'approximate' },
  { carrier: 'CTT', service: 'economy', origin: 'PT', destination: 'IT', weight_max_kg: 0.5, price_eur: 11.80, delivery_days_min: 6, delivery_days_max: 9, confidence: 'approximate' },
  { carrier: 'CTT', service: 'economy', origin: 'PT', destination: 'IT', weight_max_kg: 1, price_eur: 15.20, delivery_days_min: 6, delivery_days_max: 9, confidence: 'approximate' },
  { carrier: 'CTT', service: 'economy', origin: 'PT', destination: 'NL', weight_max_kg: 0.5, price_eur: 11.50, delivery_days_min: 5, delivery_days_max: 8, confidence: 'approximate' },
  { carrier: 'CTT', service: 'economy', origin: 'PT', destination: 'NL', weight_max_kg: 1, price_eur: 14.90, delivery_days_min: 5, delivery_days_max: 8, confidence: 'approximate' },
  { carrier: 'CTT', service: 'economy', origin: 'PT', destination: 'BE', weight_max_kg: 0.5, price_eur: 11.50, delivery_days_min: 5, delivery_days_max: 8, confidence: 'approximate' },
  { carrier: 'CTT', service: 'economy', origin: 'PT', destination: 'BE', weight_max_kg: 1, price_eur: 14.90, delivery_days_min: 5, delivery_days_max: 8, confidence: 'approximate' },
  { carrier: 'CTT', service: 'economy', origin: 'PT', destination: 'GB', weight_max_kg: 0.5, price_eur: 13.50, delivery_days_min: 6, delivery_days_max: 10, confidence: 'approximate', notes: 'Brexit: pode haver taxas de desalfandegamento ao destinatário' },
  { carrier: 'CTT', service: 'economy', origin: 'PT', destination: 'GB', weight_max_kg: 1, price_eur: 17.20, delivery_days_min: 6, delivery_days_max: 10, confidence: 'approximate' },

  // ============================================================
  // CTT — Internacional Prioritário (3-6 dias)
  // ============================================================
  { carrier: 'CTT', service: 'standard', origin: 'PT', destination: 'ES', weight_max_kg: 0.5, price_eur: 12.50, delivery_days_min: 3, delivery_days_max: 5, confidence: 'approximate' },
  { carrier: 'CTT', service: 'standard', origin: 'PT', destination: 'ES', weight_max_kg: 1, price_eur: 15.80, delivery_days_min: 3, delivery_days_max: 5, confidence: 'approximate' },
  { carrier: 'CTT', service: 'standard', origin: 'PT', destination: 'FR', weight_max_kg: 0.5, price_eur: 15.80, delivery_days_min: 3, delivery_days_max: 6, confidence: 'approximate' },
  { carrier: 'CTT', service: 'standard', origin: 'PT', destination: 'FR', weight_max_kg: 1, price_eur: 19.50, delivery_days_min: 3, delivery_days_max: 6, confidence: 'approximate' },
  { carrier: 'CTT', service: 'standard', origin: 'PT', destination: 'DE', weight_max_kg: 0.5, price_eur: 16.50, delivery_days_min: 3, delivery_days_max: 6, confidence: 'approximate' },
  { carrier: 'CTT', service: 'standard', origin: 'PT', destination: 'DE', weight_max_kg: 1, price_eur: 20.30, delivery_days_min: 3, delivery_days_max: 6, confidence: 'approximate' },
  { carrier: 'CTT', service: 'standard', origin: 'PT', destination: 'IT', weight_max_kg: 0.5, price_eur: 17.20, delivery_days_min: 4, delivery_days_max: 7, confidence: 'approximate' },
  { carrier: 'CTT', service: 'standard', origin: 'PT', destination: 'IT', weight_max_kg: 1, price_eur: 21.50, delivery_days_min: 4, delivery_days_max: 7, confidence: 'approximate' },
  { carrier: 'CTT', service: 'standard', origin: 'PT', destination: 'NL', weight_max_kg: 0.5, price_eur: 16.80, delivery_days_min: 3, delivery_days_max: 6, confidence: 'approximate' },
  { carrier: 'CTT', service: 'standard', origin: 'PT', destination: 'NL', weight_max_kg: 1, price_eur: 20.90, delivery_days_min: 3, delivery_days_max: 6, confidence: 'approximate' },
  { carrier: 'CTT', service: 'standard', origin: 'PT', destination: 'BE', weight_max_kg: 0.5, price_eur: 16.80, delivery_days_min: 3, delivery_days_max: 6, confidence: 'approximate' },
  { carrier: 'CTT', service: 'standard', origin: 'PT', destination: 'BE', weight_max_kg: 1, price_eur: 20.90, delivery_days_min: 3, delivery_days_max: 6, confidence: 'approximate' },
  { carrier: 'CTT', service: 'standard', origin: 'PT', destination: 'GB', weight_max_kg: 0.5, price_eur: 19.50, delivery_days_min: 4, delivery_days_max: 7, confidence: 'approximate' },
  { carrier: 'CTT', service: 'standard', origin: 'PT', destination: 'GB', weight_max_kg: 1, price_eur: 24.20, delivery_days_min: 4, delivery_days_max: 7, confidence: 'approximate' },

  // ============================================================
  // InPost — Locker-to-Locker International
  // Recolhido em locker PT, entregue em locker no destino.
  // ============================================================
  { carrier: 'InPost', service: 'economy', origin: 'PT', destination: 'ES', weight_max_kg: 1, price_eur: 4.99, delivery_days_min: 3, delivery_days_max: 5, confidence: 'approximate', notes: 'Locker-to-locker; rota PT-ES é a mais barata' },
  { carrier: 'InPost', service: 'economy', origin: 'PT', destination: 'FR', weight_max_kg: 1, price_eur: 8.99, delivery_days_min: 4, delivery_days_max: 6, confidence: 'approximate' },
  { carrier: 'InPost', service: 'economy', origin: 'PT', destination: 'IT', weight_max_kg: 1, price_eur: 9.49, delivery_days_min: 4, delivery_days_max: 7, confidence: 'approximate' },
  { carrier: 'InPost', service: 'economy', origin: 'PT', destination: 'DE', weight_max_kg: 1, price_eur: 8.99, delivery_days_min: 4, delivery_days_max: 6, confidence: 'approximate' },
  { carrier: 'InPost', service: 'economy', origin: 'PT', destination: 'NL', weight_max_kg: 1, price_eur: 9.49, delivery_days_min: 4, delivery_days_max: 6, confidence: 'approximate' },
  { carrier: 'InPost', service: 'economy', origin: 'PT', destination: 'BE', weight_max_kg: 1, price_eur: 9.49, delivery_days_min: 4, delivery_days_max: 6, confidence: 'approximate' },
  { carrier: 'InPost', service: 'economy', origin: 'PT', destination: 'PL', weight_max_kg: 1, price_eur: 10.99, delivery_days_min: 5, delivery_days_max: 8, confidence: 'approximate', notes: 'PL é o mercado primário da InPost — bom recall' },
  { carrier: 'InPost', service: 'economy', origin: 'PT', destination: 'GB', weight_max_kg: 1, price_eur: 11.99, delivery_days_min: 5, delivery_days_max: 8, confidence: 'approximate', notes: 'Verificar Brexit fees' },

  // ============================================================
  // Chronopost — International Premium
  // ============================================================
  { carrier: 'Chronopost', service: 'express', origin: 'PT', destination: 'ES', weight_max_kg: 1, price_eur: 18.90, delivery_days_min: 1, delivery_days_max: 2, confidence: 'approximate' },
  { carrier: 'Chronopost', service: 'express', origin: 'PT', destination: 'FR', weight_max_kg: 1, price_eur: 22.50, delivery_days_min: 1, delivery_days_max: 2, confidence: 'approximate', notes: 'Rota FR é o ponto forte (rede La Poste)' },
  { carrier: 'Chronopost', service: 'express', origin: 'PT', destination: 'DE', weight_max_kg: 1, price_eur: 26.80, delivery_days_min: 2, delivery_days_max: 3, confidence: 'approximate' },
  { carrier: 'Chronopost', service: 'express', origin: 'PT', destination: 'IT', weight_max_kg: 1, price_eur: 27.50, delivery_days_min: 2, delivery_days_max: 3, confidence: 'approximate' },
  { carrier: 'Chronopost', service: 'express', origin: 'PT', destination: 'NL', weight_max_kg: 1, price_eur: 26.80, delivery_days_min: 2, delivery_days_max: 3, confidence: 'approximate' },
  { carrier: 'Chronopost', service: 'express', origin: 'PT', destination: 'BE', weight_max_kg: 1, price_eur: 26.80, delivery_days_min: 2, delivery_days_max: 3, confidence: 'approximate' },
  { carrier: 'Chronopost', service: 'express', origin: 'PT', destination: 'GB', weight_max_kg: 1, price_eur: 32.00, delivery_days_min: 2, delivery_days_max: 4, confidence: 'placeholder' },

  // ============================================================
  // DHL Express
  // ============================================================
  { carrier: 'DHL', service: 'express', origin: 'PT', destination: 'ES', weight_max_kg: 1, price_eur: 24.50, delivery_days_min: 1, delivery_days_max: 2, confidence: 'approximate' },
  { carrier: 'DHL', service: 'express', origin: 'PT', destination: 'FR', weight_max_kg: 1, price_eur: 32.80, delivery_days_min: 1, delivery_days_max: 2, confidence: 'approximate' },
  { carrier: 'DHL', service: 'express', origin: 'PT', destination: 'DE', weight_max_kg: 1, price_eur: 34.50, delivery_days_min: 1, delivery_days_max: 2, confidence: 'approximate' },
  { carrier: 'DHL', service: 'express', origin: 'PT', destination: 'IT', weight_max_kg: 1, price_eur: 35.20, delivery_days_min: 2, delivery_days_max: 3, confidence: 'approximate' },
  { carrier: 'DHL', service: 'express', origin: 'PT', destination: 'NL', weight_max_kg: 1, price_eur: 34.80, delivery_days_min: 1, delivery_days_max: 2, confidence: 'approximate' },
  { carrier: 'DHL', service: 'express', origin: 'PT', destination: 'BE', weight_max_kg: 1, price_eur: 34.80, delivery_days_min: 1, delivery_days_max: 2, confidence: 'approximate' },
  { carrier: 'DHL', service: 'express', origin: 'PT', destination: 'GB', weight_max_kg: 1, price_eur: 38.50, delivery_days_min: 2, delivery_days_max: 3, confidence: 'approximate' },

  // ============================================================
  // DPD Classic
  // ============================================================
  { carrier: 'DPD', service: 'standard', origin: 'PT', destination: 'ES', weight_max_kg: 1, price_eur: 11.50, delivery_days_min: 2, delivery_days_max: 4, confidence: 'approximate' },
  { carrier: 'DPD', service: 'standard', origin: 'PT', destination: 'FR', weight_max_kg: 1, price_eur: 14.90, delivery_days_min: 2, delivery_days_max: 4, confidence: 'approximate' },
  { carrier: 'DPD', service: 'standard', origin: 'PT', destination: 'DE', weight_max_kg: 1, price_eur: 15.80, delivery_days_min: 2, delivery_days_max: 4, confidence: 'approximate' },
  { carrier: 'DPD', service: 'standard', origin: 'PT', destination: 'IT', weight_max_kg: 1, price_eur: 16.50, delivery_days_min: 3, delivery_days_max: 5, confidence: 'approximate' },
  { carrier: 'DPD', service: 'standard', origin: 'PT', destination: 'NL', weight_max_kg: 1, price_eur: 15.80, delivery_days_min: 2, delivery_days_max: 4, confidence: 'approximate' },
  { carrier: 'DPD', service: 'standard', origin: 'PT', destination: 'BE', weight_max_kg: 1, price_eur: 15.80, delivery_days_min: 2, delivery_days_max: 4, confidence: 'approximate' },
];
