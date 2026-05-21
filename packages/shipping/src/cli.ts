import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { logger } from '@kfi/shared';
import { DEFAULT_RATES } from './rates.js';
import { renderDashboard } from './dashboard.js';
import type { Country, Kit } from './types.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT_DIR = resolve(REPO_ROOT, 'data');

const KITS: Kit[] = [
  { type: 'kids', base_price_eur: 18, weight_kg: 0.5 },
  { type: 'adult', base_price_eur: 19, weight_kg: 0.7 },
];

const DESTINATIONS: Country[] = ['PT', 'ES', 'FR', 'IT', 'DE', 'NL', 'BE', 'PL', 'GB'];

async function main(): Promise<void> {
  const html = renderDashboard({
    kits: KITS,
    destinations: DESTINATIONS,
    rates: DEFAULT_RATES,
    generatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') + ' UTC',
  });

  await mkdir(OUT_DIR, { recursive: true });
  const outPath = resolve(OUT_DIR, 'shipping-dashboard.html');
  await writeFile(outPath, html);

  logger.info(
    { outPath, kits: KITS.length, destinations: DESTINATIONS.length, rates: DEFAULT_RATES.length },
    'shipping dashboard generated',
  );

  // Console summary
  console.log('');
  console.log(`📦 Shipping dashboard generated at: ${outPath}`);
  console.log(`   Kits: ${KITS.map((k) => `${k.type}@${k.base_price_eur}€`).join(', ')}`);
  console.log(`   Destinos: ${DESTINATIONS.join(', ')}`);
  console.log(`   Tarifas: ${DEFAULT_RATES.length}`);
  console.log('');
  console.log(`Abre no browser:  open "${outPath}"`);
  console.log('');
}

main().catch((err: unknown) => {
  logger.fatal({ err }, 'shipping cli failed');
  process.exitCode = 1;
});
