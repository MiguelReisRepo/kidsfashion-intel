import { logger } from '@kfi/shared';
import { VintedSearchResponse } from './types.js';

/**
 * Vinted is protected by Datadome. The bypass that the open-source community
 * relies on (pyvinted, vinted-rs, etc.) is session-cookie reuse:
 *
 *   1. GET https://www.vinted.pt/  with a browser-like User-Agent
 *      → Set-Cookie includes _vinted_fr_session (and on a clean residential
 *        IP, no Datadome challenge is served — the cookie is granted).
 *   2. Subsequent calls to /api/v2/catalog/items with that cookie return
 *      JSON for ~30 minutes.
 *   3. On 401/403 we discard the session and refresh.
 *
 * This works only from a non-datacenter IP. GitHub-hosted runners will get
 * a Datadome challenge on step 1; the workflow uses [self-hosted] to run
 * from the operator's residential IP instead.
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
  const raw = multipleHeaders.length > 0 ? multipleHeaders : setCookieHeader ? [setCookieHeader] : [];
  const pairs: string[] = [];
  for (const c of raw) {
    const semi = c.indexOf(';');
    const pair = semi === -1 ? c : c.slice(0, semi);
    if (pair.includes('=')) pairs.push(pair.trim());
  }
  return pairs.join('; ');
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
    if (!cookie || !cookie.includes('_vinted_fr_session')) {
      // Without the session cookie nothing downstream will work — fail hard.
      throw new Error('vinted homepage did not return _vinted_fr_session');
    }

    const html = await res.text();
    if (html.includes('captcha-delivery.com') || html.includes('datadome')) {
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
