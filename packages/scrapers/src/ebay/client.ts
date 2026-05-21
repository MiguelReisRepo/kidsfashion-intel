import got, { type Got } from 'got';
import { logger, requireEnv } from '@kfi/shared';
import { EbayOAuthResponse, EbaySearchResponse } from './types.js';

const OAUTH_ENDPOINT = 'https://api.ebay.com/identity/v1/oauth2/token';
const BROWSE_ENDPOINT = 'https://api.ebay.com/buy/browse/v1/item_summary/search';
const SCOPE = 'https://api.ebay.com/oauth/api_scope';

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }
  const clientId = requireEnv('EBAY_CLIENT_ID');
  const clientSecret = requireEnv('EBAY_CLIENT_SECRET');
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: SCOPE,
  }).toString();

  const res = await got
    .post(OAUTH_ENDPOINT, {
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      responseType: 'json',
      timeout: { request: 15_000 },
      retry: { limit: 2 },
    })
    .json<unknown>();

  const parsed = EbayOAuthResponse.parse(res);
  tokenCache = {
    token: parsed.access_token,
    expiresAt: Date.now() + parsed.expires_in * 1000,
  };
  logger.info({ expires_in: parsed.expires_in }, 'eBay OAuth token refreshed');
  return parsed.access_token;
}

export interface SearchParams {
  q: string;
  limit?: number;
  offset?: number;
  filter?: string[];
  marketplaceId?: string;
}

export async function searchEbay(params: SearchParams): Promise<EbaySearchResponse> {
  const token = await getAccessToken();
  const marketplaceId = params.marketplaceId ?? requireEnv('EBAY_MARKETPLACE_ID');

  const query: Record<string, string> = {
    q: params.q,
    limit: String(params.limit ?? 50),
    offset: String(params.offset ?? 0),
  };
  if (params.filter && params.filter.length > 0) {
    query['filter'] = params.filter.join(',');
  }

  const res = await got
    .get(BROWSE_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': marketplaceId,
        'X-EBAY-C-ENDUSERCTX': 'contextualLocation=country=PT,zip=1000',
      },
      searchParams: query,
      responseType: 'json',
      timeout: { request: 20_000 },
      retry: { limit: 2, statusCodes: [429, 500, 502, 503, 504] },
    })
    .json<unknown>();

  return EbaySearchResponse.parse(res);
}

/** Test seam — pinned client interface for fixture testing. */
export interface EbayClient {
  search(params: SearchParams): Promise<EbaySearchResponse>;
}

export const liveClient: EbayClient = { search: searchEbay };

/** Reset OAuth cache (testing only). */
export function _resetTokenCache(): void {
  tokenCache = null;
}

/** Inject a custom got instance (testing only). */
export const _testHooks: { http: Got } = { http: got };
