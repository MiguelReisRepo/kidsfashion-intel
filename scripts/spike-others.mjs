// Spike: probe Depop, Grailed, Custojusto, Catawiki — all the no-auth sources
// other than OLX (already validated). Run with `node scripts/spike-others.mjs`.

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const JSON_HEADERS = { 'User-Agent': UA, Accept: 'application/json', 'Accept-Language': 'en;q=0.9,pt;q=0.8' };
const HTML_HEADERS = { 'User-Agent': UA, Accept: 'text/html', 'Accept-Language': 'en;q=0.9' };

const PROBES = [
  // ── Depop
  {
    name: '[Depop] JSON search webapi',
    url: 'https://webapi.depop.com/api/v2/search/products/?what=benfica+jersey&offset_id=0',
    headers: JSON_HEADERS,
  },
  {
    name: '[Depop] HTML search page',
    url: 'https://www.depop.com/search/?q=benfica+jersey',
    headers: HTML_HEADERS,
  },
  // ── Grailed
  {
    name: '[Grailed] HTML search',
    url: 'https://www.grailed.com/sold/search?q=benfica',
    headers: HTML_HEADERS,
  },
  {
    name: '[Grailed] HTML listings',
    url: 'https://www.grailed.com/shop?keywords=benfica',
    headers: HTML_HEADERS,
  },
  // ── Custojusto
  {
    name: '[Custojusto] HTML search',
    url: 'https://www.custojusto.pt/anuncios?o=1&q=camisola+benfica',
    headers: HTML_HEADERS,
  },
  {
    name: '[Custojusto] JSON list',
    url: 'https://www.custojusto.pt/api/v1/offers?query=camisola+benfica',
    headers: JSON_HEADERS,
  },
  // ── Catawiki
  {
    name: '[Catawiki] HTML search',
    url: 'https://www.catawiki.com/en/s?q=benfica+jersey',
    headers: HTML_HEADERS,
  },
  {
    name: '[Catawiki] JSON search API',
    url: 'https://www.catawiki.com/buyer/api/v6/search?q=benfica+jersey',
    headers: JSON_HEADERS,
  },
];

function detectBlock(body, status) {
  if (status === 429) return 'HTTP 429 rate limit';
  if (status === 403) return 'HTTP 403 forbidden';
  if (status === 401) return 'HTTP 401 unauthorized';
  if (typeof body === 'string') {
    if (body.includes('captcha-delivery.com')) return 'Datadome challenge';
    if (body.includes('cf_chl_') || body.includes('cf-error-overview')) return 'Cloudflare challenge';
    if (/<title>Just a moment\.\.\.<\/title>/i.test(body)) return 'Cloudflare interstitial';
    if (body.includes('PerimeterX') || body.includes('px-captcha')) return 'PerimeterX challenge';
  }
  return null;
}

function summarize(body, status) {
  if (typeof body !== 'string') return '<no body>';
  if (status >= 400 && body.length < 500) return body;
  try {
    const j = JSON.parse(body);
    return JSON.stringify(j, null, 2).slice(0, 1200);
  } catch {
    const titleMatch = /<title>([^<]+)<\/title>/i.exec(body);
    const jsonLdCount = (body.match(/application\/ld\+json/g) || []).length;
    const cards =
      (body.match(/data-testid=["'][^"']*card[^"']*["']/g) || []).length ||
      (body.match(/class=["'][^"']*card[^"']*["']/g) || []).length;
    return `[HTML] title=${titleMatch?.[1]?.trim() || '?'} | ld+json blocks=${jsonLdCount} | card-ish=${cards} | size=${body.length}B`;
  }
}

async function probe(p) {
  const t0 = Date.now();
  try {
    const res = await fetch(p.url, { headers: p.headers, redirect: 'follow' });
    const body = await res.text();
    const ms = Date.now() - t0;
    const block = detectBlock(body, res.status);
    console.log('────────────────────────────────────');
    console.log(`▸ ${p.name}`);
    console.log(`  URL:    ${p.url}`);
    console.log(`  Status: ${res.status} ${res.statusText} (${ms}ms, ${body.length}B)`);
    console.log(`  Type:   ${res.headers.get('content-type') ?? '?'}`);
    if (block) console.log(`  ⚠️  BLOCK: ${block}`);
    else console.log('  ✅ no block markers');
    console.log(`  Sample:`);
    console.log(summarize(body, res.status).split('\n').map((l) => `    ${l}`).join('\n'));
  } catch (err) {
    console.log('────────────────────────────────────');
    console.log(`▸ ${p.name}`);
    console.log(`  ❌ ${err.message}`);
  }
}

console.log(`Probing 4 sources (Depop/Grailed/Custojusto/Catawiki) — ${PROBES.length} endpoints\n`);
for (const p of PROBES) {
  await probe(p);
  await new Promise((r) => setTimeout(r, 2500));
}
console.log('\nDone.');
