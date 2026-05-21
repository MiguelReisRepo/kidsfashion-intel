import { CARRIERS } from './carriers.js';
import { quotesByDestination } from './calculator.js';
import type { Carrier, Country, Kit, Quote, ShippingRate } from './types.js';

const COUNTRY_NAMES: Record<Country, string> = {
  PT: 'Portugal',
  ES: 'Espanha',
  FR: 'França',
  IT: 'Itália',
  DE: 'Alemanha',
  NL: 'Países Baixos',
  BE: 'Bélgica',
  LU: 'Luxemburgo',
  AT: 'Áustria',
  IE: 'Irlanda',
  PL: 'Polónia',
  GB: 'Reino Unido',
  CH: 'Suíça',
};

const COUNTRY_FLAGS: Record<Country, string> = {
  PT: '🇵🇹',
  ES: '🇪🇸',
  FR: '🇫🇷',
  IT: '🇮🇹',
  DE: '🇩🇪',
  NL: '🇳🇱',
  BE: '🇧🇪',
  LU: '🇱🇺',
  AT: '🇦🇹',
  IE: '🇮🇪',
  PL: '🇵🇱',
  GB: '🇬🇧',
  CH: '🇨🇭',
};

const CONFIDENCE_BADGE: Record<ShippingRate['confidence'], string> = {
  verified: '<span class="badge badge-verified">verificado</span>',
  approximate: '<span class="badge badge-approx">aprox.</span>',
  placeholder: '<span class="badge badge-placeholder">placeholder</span>',
};

function eur(n: number): string {
  return `${n.toFixed(2).replace('.', ',')} €`;
}

function renderQuoteCell(q: Quote, isCheapest: boolean): string {
  const total = eur(q.total_listing_price_eur);
  const shipping = eur(q.shipping_eur);
  const days = `${q.rate.delivery_days_min}–${q.rate.delivery_days_max}d`;
  const badge = CONFIDENCE_BADGE[q.rate.confidence];
  const star = isCheapest ? ' ⭐' : '';
  return `<td class="quote ${isCheapest ? 'cheapest' : ''}">
    <div class="price">${total}${star}</div>
    <div class="detail">${shipping} envio · ${days}</div>
    <div class="detail">${badge}</div>
  </td>`;
}

function renderKitTable(kit: Kit, destinations: Country[], rates: ShippingRate[]): string {
  const allCarriers: Carrier[] = ['CTT', 'CTT', 'InPost', 'Chronopost', 'DHL', 'DPD'];
  // Distinct carrier+service columns we want to render in fixed order
  const cols: Array<{ carrier: Carrier; service: ShippingRate['service']; label: string }> = [
    { carrier: 'CTT', service: 'economy', label: 'CTT Normal' },
    { carrier: 'CTT', service: 'registered', label: 'CTT Registado' },
    { carrier: 'CTT', service: 'registered_bulk', label: 'CTT Registado Pré-Pagos' },
    { carrier: 'CTT', service: 'standard', label: 'CTT Azul' },
    { carrier: 'InPost', service: 'economy', label: 'InPost PickPoint' },
    { carrier: 'DPD', service: 'standard', label: 'DPD Classic' },
    { carrier: 'Chronopost', service: 'express', label: 'Chronopost Express' },
    { carrier: 'DHL', service: 'express', label: 'DHL Express' },
  ];

  void allCarriers;

  const allQuotes = quotesByDestination(rates, kit, destinations);

  const head = cols.map((c) => `<th>${c.label}</th>`).join('');

  const rows = destinations
    .map((dest) => {
      const quotes = allQuotes.get(dest) ?? [];
      if (quotes.length === 0) {
        return `<tr><th class="dest">${COUNTRY_FLAGS[dest]} ${COUNTRY_NAMES[dest]}</th><td colspan="${cols.length}" class="empty">— sem rotas configuradas —</td></tr>`;
      }
      const cheapest = quotes[0]?.total_listing_price_eur;

      const cells = cols.map((col) => {
        const q = quotes.find((x) => x.rate.carrier === col.carrier && x.rate.service === col.service);
        if (!q) return `<td class="empty">—</td>`;
        return renderQuoteCell(q, q.total_listing_price_eur === cheapest);
      });

      return `<tr><th class="dest">${COUNTRY_FLAGS[dest]} ${COUNTRY_NAMES[dest]}</th>${cells.join('')}</tr>`;
    })
    .filter(Boolean)
    .join('\n');

  return `
    <h2>${kit.type === 'kids' ? '👶 Kids' : '👤 Adulto'} · base ${eur(kit.base_price_eur)} · peso estimado ${kit.weight_kg} kg</h2>
    <table>
      <thead>
        <tr><th class="dest-head">Destino</th>${head}</tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

export interface DashboardInput {
  kits: Kit[];
  destinations: Country[];
  rates: ShippingRate[];
  generatedAt: string;
}

export function renderDashboard(input: DashboardInput): string {
  const tables = input.kits.map((k) => renderKitTable(k, input.destinations, input.rates)).join('\n');

  const carrierList = Object.values(CARRIERS)
    .map(
      (meta) =>
        `<li><strong>${meta.display_name}</strong> — <a href="${meta.rate_card_url}" target="_blank" rel="noreferrer">tarifário oficial ↗</a><br><small>${meta.notes}</small></li>`,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8">
<title>KidsFashionClub · Dashboard de Envios</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #f6f7f9;
    --fg: #1a1d23;
    --muted: #6b7280;
    --card: #ffffff;
    --border: #e3e6eb;
    --accent: #1e6f3c;
    --cheap-bg: #e7f6ec;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#0f1115; --fg:#e6e8ec; --muted:#9ba0aa; --card:#171a20; --border:#262a32; --accent:#54c47b; --cheap-bg:#1f3527; }
  }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; background: var(--bg); color: var(--fg); margin: 0; padding: 2rem; }
  h1 { margin: 0 0 0.25rem 0; }
  h2 { margin-top: 2.5rem; }
  .meta { color: var(--muted); font-size: 0.9rem; margin-bottom: 2rem; }
  table { width: 100%; border-collapse: collapse; background: var(--card); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
  th, td { padding: 0.65rem 0.75rem; text-align: left; border-bottom: 1px solid var(--border); font-size: 0.9rem; vertical-align: top; }
  thead th { background: var(--card); font-weight: 600; }
  th.dest-head { width: 14rem; }
  th.dest { font-weight: 600; }
  td.quote { line-height: 1.35; }
  td.quote .price { font-weight: 600; font-size: 1rem; }
  td.quote .detail { color: var(--muted); font-size: 0.78rem; }
  td.cheapest { background: var(--cheap-bg); }
  td.cheapest .price { color: var(--accent); }
  td.empty { color: var(--muted); }
  .badge { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 500; }
  .badge-verified { background: #cde9d5; color: #14532d; }
  .badge-approx { background: #fef3c7; color: #92400e; }
  .badge-placeholder { background: #fee2e2; color: #991b1b; }
  .notice { background: #fff7ed; border: 1px solid #fed7aa; color: #7c2d12; padding: 1rem 1.25rem; border-radius: 8px; margin: 1.5rem 0; }
  @media (prefers-color-scheme: dark) {
    .notice { background:#3a2b1a; border-color:#6b4623; color:#f1d5a8; }
    .badge-verified { background:#1e4730; color:#a7d8b5; }
    .badge-approx { background:#4a3a12; color:#f1d394; }
    .badge-placeholder { background:#4a1f1f; color:#f1a7a7; }
  }
  ul.carriers { line-height: 1.7; }
  ul.carriers small { color: var(--muted); }
  a { color: var(--accent); }
</style>
</head>
<body>
  <h1>Dashboard de Envios · KidsFashionClub</h1>
  <div class="meta">Gerado em ${input.generatedAt} · Origem PT · Preços finais para listing (base + envio).</div>

  <div class="notice">
    <strong>⚠️ Tarifas marcadas como "aprox." são estimativas baseadas em tarifários públicos 2024–2025 — verifica cada rota no tarifário oficial antes de listar produtos reais em eBay.</strong>
    Os tarifários mudam tipicamente em Janeiro de cada ano e podem ter sobretaxas mensais (combustível) que não estão refletidas aqui. As marcas "verificado" indicam linhas que foste a confirmar à tarifa oficial.
  </div>

  ${tables}

  <h2>Transportadoras (links para tarifários oficiais)</h2>
  <ul class="carriers">
    ${carrierList}
  </ul>
</body>
</html>`;
}
