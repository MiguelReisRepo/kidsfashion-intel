// Spike: probe each implemented marketplace for "Portugal" jerseys in
// kids-relevant scopes. Run with `node scripts/spike-search-portugal-kids.mjs`.
//
// OLX-PT has no kids-specific sub-category for football jerseys (everything
// lands under cat 5430 "Camisolas e Equipamentos" alongside adult items), so
// we run three strategies and surface the union, then post-filter by title
// keywords to estimate the kids share.
//
// eBay uses Soccer-Football Shirts (cat 123490) + "kids" query refinement.
// Skipped cleanly if creds aren't set.

import { readFileSync, existsSync } from 'node:fs';

// ---------- .env loader (no dotenv dep) ----------
function loadDotEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}
const fileEnv = { ...loadDotEnv('.env'), ...loadDotEnv('.env.local') };
const env = (k) => process.env[k] ?? fileEnv[k] ?? '';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const KIDS_RX = /\b(crian[çc]a|criança|crianças|criancas|kids?|junior|infant(?:il)?|bebé|bebe|baby)\b/i;
const KIDS_SIZE_RX = /\b(4-5|6-7|8-9|10-11|12-13|10\s*anos|12\s*anos|14\s*anos|tamanho\s*\d{1,3}\s*(?:cm|anos?))\b/i;

const eur = (o) => {
  const p = o.params?.find((x) => x.key === 'price');
  return p?.value?.value ? `${p.value.value} ${p.value.currency || '€'}` : '?';
};
const isKids = (title, params) =>
  KIDS_RX.test(title) ||
  KIDS_SIZE_RX.test(title) ||
  params.some((p) => /child|kids?|criança|criancas/i.test(p.name || '') || /child|kids?|criança/i.test(String(p.value?.label || p.value || '')));

// ============================================================
// OLX-PT
// ============================================================
async function olxSearch({ label, query, categoryId }) {
  const url = new URL('https://www.olx.pt/api/v1/offers');
  url.searchParams.set('query', query);
  url.searchParams.set('limit', '40');
  if (categoryId) url.searchParams.set('category_id', String(categoryId));
  const t0 = Date.now();
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  const ms = Date.now() - t0;
  if (!res.ok) {
    console.log(`  [${label}] HTTP ${res.status} ${res.statusText} (${ms}ms)`);
    return { offers: [], total: 0 };
  }
  const body = await res.json();
  const offers = body?.data ?? [];
  const total = body?.metadata?.total_elements ?? offers.length;
  console.log(`  [${label}] ${offers.length} returned of ~${total} total (${ms}ms) · ${url.toString()}`);
  return { offers, total };
}

async function probeOlx() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  OLX-PT · "Portugal" · 3 kids-relevant strategies            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  // cat 292  = /bebes-criancas/roupinhas/  (kids clothing — 783 results for "Portugal")
  // cat 5430 = adult sports apparel (Camisolas e Equipamentos) — included for comparison
  const strategies = [
    { label: 'A · q="Portugal" + cat 292 (kids clothing)', query: 'Portugal',         categoryId: 292 },
    { label: 'B · q="Portugal criança" + cat 292',         query: 'Portugal criança', categoryId: 292 },
    { label: 'C · q="Portugal" + cat 5430 (adult apparel)', query: 'Portugal',         categoryId: 5430 },
  ];

  const seen = new Map();
  for (const s of strategies) {
    const { offers } = await olxSearch(s);
    for (const o of offers) {
      if (!seen.has(o.id)) seen.set(o.id, { offer: o, strategies: [s.label.split(' ·')[0]] });
      else seen.get(o.id).strategies.push(s.label.split(' ·')[0]);
    }
    await new Promise((r) => setTimeout(r, 1200));
  }

  const all = [...seen.values()];
  const kidsOnly = all.filter(({ offer }) => isKids(offer.title, offer.params ?? []));
  console.log(`\n  union: ${all.length} unique offers · kids-confident: ${kidsOnly.length}\n`);
  console.log('  ─── kids-confident sample ───');
  kidsOnly.slice(0, 12).forEach(({ offer, strategies }, i) => {
    const city = offer.location?.city?.name ?? '?';
    const cat = offer.category?.id ?? '?';
    console.log(`  ${(i + 1).toString().padStart(2)}. [cat=${cat} via=${strategies.join(',')}] ${eur(offer)} · ${city}`);
    console.log(`      ${offer.title.slice(0, 80)}`);
    console.log(`      ${offer.url}`);
  });
}

// ============================================================
// eBay (Browse API)
// ============================================================
async function probeEbay() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  eBay · "Portugal" · Soccer-Football Shirts + kids refinement║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const cid = env('EBAY_CLIENT_ID');
  const sec = env('EBAY_CLIENT_SECRET');
  const marketplace = env('EBAY_MARKETPLACE_ID') || 'EBAY_GB';
  if (!cid || !sec) {
    console.log('  ⏭️  skipped — set EBAY_CLIENT_ID / EBAY_CLIENT_SECRET in .env.local to enable');
    return;
  }

  const basic = Buffer.from(`${cid}:${sec}`).toString('base64');
  const tokRes = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
  });
  if (!tokRes.ok) {
    console.log(`  ❌ OAuth ${tokRes.status}: ${(await tokRes.text()).slice(0, 200)}`);
    return;
  }
  const tok = (await tokRes.json()).access_token;
  console.log(`  ✅ OAuth ok (marketplace=${marketplace})`);

  const url = new URL('https://api.ebay.com/buy/browse/v1/item_summary/search');
  url.searchParams.set('q', 'Portugal kids');
  url.searchParams.set('category_ids', '123490'); // Soccer-Football Shirts
  url.searchParams.set('limit', '25');

  const t0 = Date.now();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${tok}`, 'X-EBAY-C-MARKETPLACE-ID': marketplace },
  });
  const ms = Date.now() - t0;
  console.log(`  GET ${url.toString()}`);
  console.log(`  ↳ HTTP ${res.status} ${res.statusText} (${ms}ms)`);
  if (!res.ok) return void console.log(`  body: ${(await res.text()).slice(0, 400)}`);
  const body = await res.json();
  const items = body.itemSummaries ?? [];
  console.log(`  ↳ ${items.length} items (server total=${body.total ?? '?'})\n`);
  items.slice(0, 12).forEach((it, i) => {
    const price = `${it.price?.value ?? '?'} ${it.price?.currency ?? ''}`.trim();
    const loc = it.itemLocation?.country ?? '?';
    console.log(`  ${(i + 1).toString().padStart(2)}. ${price} · ${loc}`);
    console.log(`      ${(it.title ?? '').slice(0, 80)}`);
    console.log(`      ${it.itemWebUrl ?? ''}`);
  });
}

// ============================================================
(async () => {
  await probeOlx();
  await new Promise((r) => setTimeout(r, 1500));
  await probeEbay();
  console.log('\nDone.');
})().catch((err) => {
  console.error('Fatal:', err);
  process.exitCode = 1;
});
