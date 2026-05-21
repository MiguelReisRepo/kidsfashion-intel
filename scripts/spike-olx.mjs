// Spike: probe OLX.pt to see what endpoints respond and what anti-bot looks like.
// Throwaway — runs with `node scripts/spike-olx.mjs`. No deps.

const UA_DESKTOP =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const UA_MOBILE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (Version/17.2 Mobile/15E148 Safari/604.1)';

const PROBES = [
  {
    name: 'HTML search page (desktop UA)',
    url: 'https://www.olx.pt/ads/q-camisola-benfica/',
    headers: { 'User-Agent': UA_DESKTOP, Accept: 'text/html' },
  },
  {
    name: 'JSON API v1/offers',
    url: 'https://www.olx.pt/api/v1/offers?query=camisola+benfica&limit=20',
    headers: {
      'User-Agent': UA_DESKTOP,
      Accept: 'application/json',
      'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
    },
  },
  {
    name: 'JSON API v1/friendly-links (resolves text query)',
    url: 'https://www.olx.pt/api/v1/friendly-links/query-params/q-camisola-benfica/',
    headers: { 'User-Agent': UA_DESKTOP, Accept: 'application/json' },
  },
  {
    name: 'Mobile app search endpoint',
    url: 'https://m.olx.pt/api/relevance/search?query=camisola+benfica&page=1',
    headers: { 'User-Agent': UA_MOBILE, Accept: 'application/json' },
  },
];

function detectBlock(body, status) {
  if (status === 429) return 'HTTP 429 rate limit';
  if (status === 403) return 'HTTP 403 forbidden';
  if (typeof body === 'string') {
    if (body.includes('captcha-delivery.com')) return 'Datadome challenge';
    if (body.includes('cf_chl_') || body.includes('cf-error-overview')) return 'Cloudflare challenge';
    if (/<title>Just a moment\.\.\.<\/title>/i.test(body)) return 'Cloudflare interstitial';
  }
  return null;
}

function summarize(body, status) {
  if (typeof body !== 'string') return '<no body>';
  if (status >= 400) return body.slice(0, 400);
  // Try JSON-ish
  try {
    const j = JSON.parse(body);
    return JSON.stringify(j, null, 2).slice(0, 1200);
  } catch {
    // HTML — look for listing markers
    const titleMatch = /<title>([^<]+)<\/title>/i.exec(body);
    const offerCount = (body.match(/data-cy=["']l-card["']/g) || []).length;
    const adCount = (body.match(/"id":\s*"?\d+"?/g) || []).length;
    return `[HTML] title=${titleMatch?.[1]?.trim() || '?'} | offer-cards=${offerCount} | json-ids-in-page=${adCount} | size=${body.length}B`;
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
    else console.log('  ✅ no block markers detected');
    console.log(`  Sample:`);
    console.log(summarize(body, res.status).split('\n').map((l) => `    ${l}`).join('\n'));
  } catch (err) {
    console.log('────────────────────────────────────');
    console.log(`▸ ${p.name}`);
    console.log(`  URL:    ${p.url}`);
    console.log(`  ❌ ERROR: ${err.message}`);
  }
}

console.log(`Probing OLX.pt from this machine — ${PROBES.length} endpoints\n`);
for (const p of PROBES) {
  await probe(p);
  // polite delay
  await new Promise((r) => setTimeout(r, 2000));
}
console.log('\nDone.');
