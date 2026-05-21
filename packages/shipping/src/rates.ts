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
  // CTT Correio Normal — slow, sem tracking, pacote postal (verificado tarifário 2026 balcão)
  { carrier: 'CTT', service: 'economy', origin: 'PT', destination: 'PT', weight_max_kg: 0.5, price_eur: 2.34, delivery_days_min: 2, delivery_days_max: 4, confidence: 'verified', notes: 'Correio Normal Nacional pacote postal (sem tracking)' },
  { carrier: 'CTT', service: 'economy', origin: 'PT', destination: 'PT', weight_max_kg: 2, price_eur: 5.55, delivery_days_min: 2, delivery_days_max: 4, confidence: 'verified', notes: 'Correio Normal Nacional pacote postal (sem tracking)' },
  // CTT Correio Azul — priority, sem tracking, pacote postal (verificado 2026)
  { carrier: 'CTT', service: 'standard', origin: 'PT', destination: 'PT', weight_max_kg: 0.5, price_eur: 3.90, delivery_days_min: 1, delivery_days_max: 2, confidence: 'verified', notes: 'Correio Azul Nacional pacote postal (prioritário, sem tracking)' },
  { carrier: 'CTT', service: 'standard', origin: 'PT', destination: 'PT', weight_max_kg: 2, price_eur: 7.80, delivery_days_min: 1, delivery_days_max: 2, confidence: 'verified', notes: 'Correio Azul Nacional pacote postal' },
  // CTT Correio Registado — COM tracking, pacote postal (verificado 2026 balcão)
  { carrier: 'CTT', service: 'registered', origin: 'PT', destination: 'PT', weight_max_kg: 0.1, price_eur: 4.60, delivery_days_min: 2, delivery_days_max: 4, confidence: 'verified', notes: 'Correio Registado pacote postal — com tracking e assinatura' },
  { carrier: 'CTT', service: 'registered', origin: 'PT', destination: 'PT', weight_max_kg: 0.5, price_eur: 5.40, delivery_days_min: 2, delivery_days_max: 4, confidence: 'verified', notes: 'Correio Registado pacote postal 100g-500g — preço balcão' },
  { carrier: 'CTT', service: 'registered', origin: 'PT', destination: 'PT', weight_max_kg: 2, price_eur: 8.93, delivery_days_min: 2, delivery_days_max: 4, confidence: 'verified', notes: 'Correio Registado pacote postal 500g-2kg — preço balcão' },
  // CTT Correio Registado Pré-Pagos — mesmo serviço, requer contrato/máquina franquiar ou pré-pagamento volume
  { carrier: 'CTT', service: 'registered_bulk', origin: 'PT', destination: 'PT', weight_max_kg: 0.1, price_eur: 3.45, delivery_days_min: 2, delivery_days_max: 4, confidence: 'verified', notes: 'CTT Registado Pré-Pagos — requer contrato CTT (compensa a partir de ~30 envios/mês)' },
  { carrier: 'CTT', service: 'registered_bulk', origin: 'PT', destination: 'PT', weight_max_kg: 0.5, price_eur: 4.00, delivery_days_min: 2, delivery_days_max: 4, confidence: 'verified', notes: 'CTT Registado Pré-Pagos 100g-500g (poupa 1,40€ vs balcão)' },
  { carrier: 'CTT', service: 'registered_bulk', origin: 'PT', destination: 'PT', weight_max_kg: 2, price_eur: 6.37, delivery_days_min: 2, delivery_days_max: 4, confidence: 'verified', notes: 'CTT Registado Pré-Pagos 500g-2kg (poupa 2,56€ vs balcão)' },
  // InPost Locker-to-Locker (PickPoint / Point Relais PCL) — verificado calculator inpost.pt
  { carrier: 'InPost', service: 'economy', origin: 'PT', destination: 'PT', weight_max_kg: 0.5, price_eur: 4.76, delivery_days_min: 2, delivery_days_max: 4, confidence: 'verified', notes: 'PickPoint Locker-to-Locker' },
  { carrier: 'InPost', service: 'economy', origin: 'PT', destination: 'PT', weight_max_kg: 1, price_eur: 5.42, delivery_days_min: 2, delivery_days_max: 4, confidence: 'verified', notes: 'PickPoint Locker-to-Locker' },
  { carrier: 'InPost', service: 'economy', origin: 'PT', destination: 'PT', weight_max_kg: 2, price_eur: 5.89, delivery_days_min: 2, delivery_days_max: 4, confidence: 'verified', notes: 'PickPoint Locker-to-Locker' },
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
  // InPost PickPoint (Point Relais PCL) — Locker-to-Locker International
  // Preços VERIFICADOS no calculator oficial inpost.pt/envio-de-encomenda (2026-05-21)
  // ============================================================
  { carrier: 'InPost', service: 'economy', origin: 'PT', destination: 'ES', weight_max_kg: 0.5, price_eur: 5.12, delivery_days_min: 3, delivery_days_max: 6, confidence: 'verified', notes: 'PickPoint — rota PT-ES é a mais barata' },
  { carrier: 'InPost', service: 'economy', origin: 'PT', destination: 'ES', weight_max_kg: 1, price_eur: 5.81, delivery_days_min: 3, delivery_days_max: 6, confidence: 'verified', notes: 'PickPoint' },
  { carrier: 'InPost', service: 'economy', origin: 'PT', destination: 'ES', weight_max_kg: 2, price_eur: 6.64, delivery_days_min: 3, delivery_days_max: 6, confidence: 'verified', notes: 'PickPoint' },
  { carrier: 'InPost', service: 'economy', origin: 'PT', destination: 'FR', weight_max_kg: 0.5, price_eur: 11.32, delivery_days_min: 3, delivery_days_max: 6, confidence: 'verified', notes: 'PickPoint' },
  { carrier: 'InPost', service: 'economy', origin: 'PT', destination: 'FR', weight_max_kg: 1, price_eur: 12.37, delivery_days_min: 3, delivery_days_max: 6, confidence: 'verified', notes: 'PickPoint' },
  { carrier: 'InPost', service: 'economy', origin: 'PT', destination: 'IT', weight_max_kg: 0.5, price_eur: 10.75, delivery_days_min: 3, delivery_days_max: 6, confidence: 'verified', notes: 'PickPoint' },
  { carrier: 'InPost', service: 'economy', origin: 'PT', destination: 'IT', weight_max_kg: 1, price_eur: 11.72, delivery_days_min: 3, delivery_days_max: 6, confidence: 'verified', notes: 'PickPoint' },
  { carrier: 'InPost', service: 'economy', origin: 'PT', destination: 'DE', weight_max_kg: 0.5, price_eur: 12.63, delivery_days_min: 3, delivery_days_max: 6, confidence: 'verified', notes: 'PickPoint' },
  { carrier: 'InPost', service: 'economy', origin: 'PT', destination: 'DE', weight_max_kg: 1, price_eur: 12.63, delivery_days_min: 3, delivery_days_max: 6, confidence: 'verified', notes: 'PickPoint' },
  { carrier: 'InPost', service: 'economy', origin: 'PT', destination: 'NL', weight_max_kg: 0.5, price_eur: 14.50, delivery_days_min: 3, delivery_days_max: 6, confidence: 'verified', notes: 'PickPoint' },
  { carrier: 'InPost', service: 'economy', origin: 'PT', destination: 'NL', weight_max_kg: 1, price_eur: 15.73, delivery_days_min: 3, delivery_days_max: 6, confidence: 'verified', notes: 'PickPoint' },
  { carrier: 'InPost', service: 'economy', origin: 'PT', destination: 'BE', weight_max_kg: 0.5, price_eur: 12.54, delivery_days_min: 3, delivery_days_max: 6, confidence: 'verified', notes: 'PickPoint' },
  { carrier: 'InPost', service: 'economy', origin: 'PT', destination: 'BE', weight_max_kg: 1, price_eur: 13.58, delivery_days_min: 3, delivery_days_max: 6, confidence: 'verified', notes: 'PickPoint' },
  { carrier: 'InPost', service: 'economy', origin: 'PT', destination: 'LU', weight_max_kg: 1, price_eur: 14.32, delivery_days_min: 3, delivery_days_max: 6, confidence: 'verified', notes: 'PickPoint' },
  { carrier: 'InPost', service: 'economy', origin: 'PT', destination: 'PL', weight_max_kg: 0.5, price_eur: 14.85, delivery_days_min: 3, delivery_days_max: 6, confidence: 'verified', notes: 'PickPoint — PL é o mercado primário da InPost' },
  { carrier: 'InPost', service: 'economy', origin: 'PT', destination: 'PL', weight_max_kg: 1, price_eur: 15.77, delivery_days_min: 3, delivery_days_max: 6, confidence: 'verified', notes: 'PickPoint' },

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
