import { logger } from '@kfi/shared';
import { OlxSearchResponse } from './types.js';

const SEARCH_ENDPOINT = 'https://www.olx.pt/api/v1/offers';

// Empirically: OLX accepts native Node fetch (Undici) but rejects got with 403.
// Likely TLS-fingerprint or header-ordering detection. Keep this on fetch.
const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'application/json',
  'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
};

export interface OlxSearchParams {
  query: string;
  limit?: number;
  offset?: number;
  categoryId?: number;
}

export async function searchOlx(params: OlxSearchParams): Promise<OlxSearchResponse> {
  const url = new URL(SEARCH_ENDPOINT);
  url.searchParams.set('query', params.query);
  url.searchParams.set('limit', String(params.limit ?? 40));
  url.searchParams.set('offset', String(params.offset ?? 0));
  if (params.categoryId !== undefined) {
    url.searchParams.set('category_id', String(params.categoryId));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const res = await fetch(url, {
      headers: DEFAULT_HEADERS,
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`OLX search ${res.status} ${res.statusText} for ${url.pathname}?${url.searchParams.toString()}`);
    }
    const body = await res.json();
    const parsed = OlxSearchResponse.parse(body);
    logger.debug(
      { query: params.query, count: parsed.data.length },
      'olx-pt search ok',
    );
    return parsed;
  } finally {
    clearTimeout(timeout);
  }
}
