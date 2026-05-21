import { logger } from '@kfi/shared';
import { VintedSearchResponse } from './types.js';

/**
 * Vinted is protected by Datadome. The bypass that the open-source community
 * relies on (pyvinted, vinted-rs, etc.) is session-cookie reuse:
 *
 *   1. GET https://www.vinted.pt/  with a browser-like User-Agent
 *      → Set-Cookie includes anon_id + access_token_web (JWT) + refresh_token_web.
 *        On a clean residential IP, no Datadome challenge is served.
 *      Note: Vinted retired the legacy `_vinted_fr_session` cookie in 2024.
 *   2. Subsequent calls to /api/v2/catalog/items with the full Cookie header
 *      return JSON for ~30 minutes.
 *   3. On 401/403 we discard the session and refresh.
 *
 * This works only from a non-datacenter IP. GitHub-hosted runners will get
 * a Datadome challenge on step 1; the workflow uses [self-hosted] to run
 * from the operator's residential IP instead.
 *
 * Empirically validated (May 2026) against vinted.pt — catalog 1204 (vestuário
 * desportivo meninos) returns ~960 hits for "Portugal", catalog 1253 (vestuário
 * desportivo meninas) ~606 hits. See scripts/spike-search-portugal-kids.mjs.
 */

const BASE = 'https://www.vinted.pt';
const HOMEPAGE = `${BASE}/`;
const SEARCH = `${BASE}/api/v2/catalog/items`;
const SESSION_TTL_MS = 25 * 60 * 1000; // 25min, Vinted cookies last ~30
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

interface Session {
  cookie: string;
  csrfToken: string | undefined;
  fetchedAt: number;
}

let cached: Session | null = null;
let inFlightRefresh: Promise<Session> | null = null;

function extractCsrfToken(html: string): string | undefined {
  const m = html.match(/<meta[^>]+name=["']csrf-token["'][^>]+content=["']([^"']+)["']/i);
  return m?.[1];
}

function extractCookies(setCookieHeader: string | null, multipleHeaders: string[]): string {
  // Node's `Headers.get('set-cookie')` returns a single comma-joined string which
  // is wrong for cookies (they legitimately contain commas in Expires=). We use
  // `Headers.getSetCookie()` when available, falling back to the joined string.
  // Vinted's homepage sometimes sets an empty value before the real one in the
  // same response (e.g. `access_token_web=; Max-Age=-1` then `access_token_web=eyJ…`).
  // We must NOT carry over the empty unsets, so we map by name and keep only
  // non-empty values.
  const raw = multipleHeaders.length > 0 ? multipleHeaders : setCookieHeader ? [setCookieHeader] : [];
  const byName = new Map<string, string>();
  for (const c of raw) {
    const semi = c.indexOf(';');
    const pair = semi === -1 ? c : c.slice(0, semi);
    const eq = pair.indexOf('=');
    if (eq <= 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (value) byName.set(name, value);
  }
  return [...byName.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function refresh(): Promise<Session> {
  if (inFlightRefresh) return inFlightRefresh;
  inFlightRefresh = (async () => {
    logger.info('vinted session refresh');
    const res = await fetch(HOMEPAGE, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'manual',
    });

    // Anything other than 200 is almost certainly a Datadome challenge.
    if (res.status !== 200 && res.status !== 301 && res.status !== 302) {
      throw new Error(`vinted homepage ${res.status} (likely Datadome — confirm IP type)`);
    }

    const setCookies = typeof (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie === 'function'
      ? (res.headers as Headers & { getSetCookie: () => string[] }).getSetCookie()
      : [];
    const cookie = extractCookies(res.headers.get('set-cookie'), setCookies);
    if (!cookie || !cookie.includes('access_token_web=')) {
      // Without the JWT cookie nothing downstream will work — fail hard.
      throw new Error('vinted homepage did not return access_token_web (IP may be flagged)');
    }

    const html = await res.text();
    // A real Datadome challenge page is <50KB and titled "captcha-delivery". The
    // normal Vinted homepage is ~2MB and references the datadome JS by URL, which
    // would false-positive a naive string match. Use size + path to discriminate.
    if (html.length < 100_000 && /captcha-delivery\.com/.test(html)) {
      throw new Error('vinted homepage served Datadome challenge — IP is flagged');
    }
    const csrfToken = extractCsrfToken(html);

    const session: Session = { cookie, csrfToken, fetchedAt: Date.now() };
    cached = session;
    logger.info({ haveCsrf: !!csrfToken }, 'vinted session ok');
    return session;
  })().finally(() => {
    inFlightRefresh = null;
  });
  return inFlightRefresh;
}

async function getSession(force = false): Promise<Session> {
  if (!force && cached && Date.now() - cached.fetchedAt < SESSION_TTL_MS) return cached;
  return refresh();
}

export interface VintedSearchParams {
  searchText: string;
  catalogIds?: number[];
  perPage?: number;
  page?: number;
  /** newest_first | price_low_to_high | price_high_to_low | relevance */
  order?: 'newest_first' | 'price_low_to_high' | 'price_high_to_low' | 'relevance';
}

export async function searchVinted(params: VintedSearchParams): Promise<VintedSearchResponse> {
  const url = new URL(SEARCH);
  url.searchParams.set('search_text', params.searchText);
  if (params.catalogIds && params.catalogIds.length > 0) {
    url.searchParams.set('catalog_ids', params.catalogIds.join(','));
  }
  url.searchParams.set('per_page', String(params.perPage ?? 96));
  url.searchParams.set('page', String(params.page ?? 1));
  url.searchParams.set('order', params.order ?? 'newest_first');

  let attempts = 0;
  while (attempts < 2) {
    attempts++;
    const session = await getSession(attempts === 2);
    const headers: Record<string, string> = {
      'User-Agent': UA,
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
      Referer: HOMEPAGE,
      Cookie: session.cookie,
    };
    if (session.csrfToken) headers['X-Csrf-Token'] = session.csrfToken;

    const res = await fetch(url, { headers });
    if (res.status === 200) {
      const json = await res.json();
      return VintedSearchResponse.parse(json);
    }
    if (res.status === 401 || res.status === 403) {
      logger.warn({ status: res.status, attempt: attempts }, 'vinted session rejected — refreshing');
      cached = null;
      continue;
    }
    const body = await res.text().catch(() => '');
    throw new Error(`vinted search ${res.status} ${res.statusText}: ${body.slice(0, 200)}`);
  }
  throw new Error('vinted search failed after refresh');
}

/** Testing seam. */
export function _resetVintedSession(): void {
  cached = null;
  inFlightRefresh = null;
}
