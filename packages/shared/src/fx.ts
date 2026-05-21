import { logger } from './logger.js';

const ECB_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';

interface CachedRates {
  fetchedAt: number;
  ratesToEur: Map<string, number>;
}

let cache: CachedRates | undefined;
const TTL_MS = 6 * 60 * 60 * 1000;

export async function fetchEcbRates(): Promise<Map<string, number>> {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) {
    return cache.ratesToEur;
  }

  const res = await fetch(ECB_URL);
  if (!res.ok) {
    throw new Error(`ECB fetch failed: ${res.status} ${res.statusText}`);
  }
  const xml = await res.text();

  const ratesToEur = new Map<string, number>();
  ratesToEur.set('EUR', 1);

  const regex = /<Cube\s+currency=['"]([A-Z]{3})['"]\s+rate=['"]([0-9.]+)['"]\s*\/>/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    const currency = match[1];
    const rate = match[2];
    if (!currency || !rate) continue;
    const numeric = Number.parseFloat(rate);
    if (!Number.isFinite(numeric) || numeric <= 0) continue;
    ratesToEur.set(currency, 1 / numeric);
  }

  cache = { fetchedAt: Date.now(), ratesToEur };
  logger.info({ currencies: ratesToEur.size }, 'ECB FX rates loaded');
  return ratesToEur;
}

export async function toEur(amount: number, currency: string): Promise<number> {
  if (amount === 0) return 0;
  const cur = currency.toUpperCase();
  const rates = await fetchEcbRates();
  const rate = rates.get(cur);
  if (rate === undefined) {
    throw new Error(`Unknown currency for EUR conversion: ${cur}`);
  }
  return Math.round(amount * rate * 100) / 100;
}
