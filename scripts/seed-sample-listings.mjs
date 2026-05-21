// Fetches live "Portugal" kids listings from Vinted (cat 1204+1253) and OLX-PT
// (cat 292) and writes them in the shape expected by the dashboard's
// new-listings page, so the dev server can show real data without Supabase.

import { writeFileSync } from 'node:fs';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function cookieHeader(setCookies) {
  const m = new Map();
  for (const c of setCookies) {
    const pair = c.split(';')[0];
    const eq = pair.indexOf('=');
    if (eq > 0) {
      const k = pair.slice(0, eq).trim();
      const v = pair.slice(eq + 1).trim();
      if (v) m.set(k, v);
    }
  }
  return [...m.entries()].map(([k, v]) => k + '=' + v).join('; ');
}

const KIDS_RX = /\b(crian[çc]a|kids?|junior|infant(?:il)?|bebé|bebe|baby|ans|anos|maillot|enfant)\b/i;

async function fetchVinted() {
  const home = await fetch('https://www.vinted.pt/', { headers: { 'User-Agent': UA } });
  const cookie = cookieHeader(home.headers.getSetCookie());
  const url = new URL('https://www.vinted.pt/api/v2/catalog/items');
  url.searchParams.set('search_text', 'Portugal');
  url.searchParams.set('catalog_ids', '1204,1253');
  url.searchParams.set('per_page', '40');
  url.searchParams.set('order', 'newest_first');
  const r = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json', Referer: 'https://www.vinted.pt/', Cookie: cookie },
  });
  if (!r.ok) throw new Error('vinted ' + r.status);
  const j = await r.json();
  return (j.items ?? []).map((it) => ({
    id: 'vinted-' + it.id,
    source_name: 'vinted',
    url: it.url,
    title_raw: it.title,
    size: it.size_title ?? null,
    price_eur: typeof it.price?.amount === 'string' ? parseFloat(it.price.amount) : (it.price?.amount ?? null),
    currency: it.price?.currency_code ?? 'EUR',
    country: 'PT',
    brand: it.brand_title ?? null,
    photos: it.photo?.url ? [it.photo.url] : (it.photo?.full_size_url ? [it.photo.full_size_url] : []),
    team_slug: /portugal/i.test(it.title) ? 'portugal' : null,
    season: (it.title.match(/\b(20\d{2}\/?\d{0,2})\b/) ?? [])[1] ?? null,
    kit_type: /away|alternat/i.test(it.title) ? 'away' : /home|principal|main/i.test(it.title) ? 'home' : null,
    gender_age: KIDS_RX.test(it.title) || /\d+\s*(?:anos?|ans)/.test(it.title) ? 'kids' : null,
    condition: null,
    first_seen_at: new Date().toISOString(),
  }));
}

async function fetchOlx() {
  const url = new URL('https://www.olx.pt/api/v1/offers');
  url.searchParams.set('query', 'Portugal');
  url.searchParams.set('category_id', '292');
  url.searchParams.set('limit', '30');
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!r.ok) throw new Error('olx ' + r.status);
  const j = await r.json();
  return (j.data ?? []).map((o) => {
    const priceParam = o.params?.find((p) => p.key === 'price');
    const price = priceParam?.value?.value ?? null;
    const photo = o.photos?.[0]?.link?.replace(/{width}|{height}/g, '600') ?? null;
    return {
      id: 'olx-' + o.id,
      source_name: 'olx-pt',
      url: o.url,
      title_raw: o.title,
      size: null,
      price_eur: typeof price === 'number' ? price : null,
      currency: 'EUR',
      country: 'PT',
      brand: null,
      photos: photo ? [photo] : [],
      team_slug: /portugal|seleç/i.test(o.title) ? 'portugal' : null,
      season: (o.title.match(/\b(20\d{2}\/?\d{0,2})\b/) ?? [])[1] ?? null,
      kit_type: /alternat|away/i.test(o.title) ? 'away' : /home|principal/i.test(o.title) ? 'home' : null,
      gender_age: KIDS_RX.test(o.title) ? 'kids' : null,
      condition: null,
      first_seen_at: new Date().toISOString(),
    };
  });
}

(async () => {
  console.log('Fetching Vinted...');
  const vinted = await fetchVinted();
  console.log('  got', vinted.length);
  await new Promise((r) => setTimeout(r, 1500));
  console.log('Fetching OLX-PT...');
  const olx = await fetchOlx();
  console.log('  got', olx.length);

  // Interleave so the sample feels mixed (newest first by source roughly).
  const merged = [...vinted, ...olx].sort(() => Math.random() - 0.5);
  const out = 'C:/Users/migue/Desktop/kidsfashion-intel/packages/dashboard/src/data/sample-listings.json';
  writeFileSync(out, JSON.stringify(merged, null, 2));
  console.log('Wrote', merged.length, 'listings to', out);
})().catch((e) => {
  console.error('Fatal:', e.message);
  process.exitCode = 1;
});
