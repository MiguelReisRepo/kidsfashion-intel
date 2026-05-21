import got from 'got';
import { logger, requireEnv } from '@kfi/shared';
import { MlOAuthResponse, MlSearchResponse } from './types.js';

const OAUTH_ENDPOINT = 'https://api.mercadolibre.com/oauth/token';
const SEARCH_ENDPOINT = 'https://api.mercadolibre.com/sites';

interface TokenCache {
  token: string;
  expiresAt: number;
}
let tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }
  const appId = requireEnv('MERCADOLIVRE_APP_ID');
  const clientSecret = requireEnv('MERCADOLIVRE_CLIENT_SECRET');

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: appId,
    client_secret: clientSecret,
  }).toString();

  const res = await got
    .post(OAUTH_ENDPOINT, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      responseType: 'json',
      timeout: { request: 15_000 },
      retry: { limit: 2 },
    })
    .json<unknown>();

  const parsed = MlOAuthResponse.parse(res);
  tokenCache = {
    token: parsed.access_token,
    expiresAt: Date.now() + parsed.expires_in * 1000,
  };
  logger.info({ expires_in: parsed.expires_in }, 'mercadolivre OAuth token refreshed');
  return parsed.access_token;
}

export interface MlSearchParams {
  q: string;
  /** Mercado Livre site code. MLB=Brasil (default), MLA=Argentina, MLM=Mexico, MPT=Portugal (limited). */
  siteId?: string;
  limit?: number;
  offset?: number;
  /** ML category id (e.g. MLB1276 = Camisas de Futebol). */
  categoryId?: string;
}

export async function searchMercadoLivre(params: MlSearchParams): Promise<MlSearchResponse> {
  const token = await getAccessToken();
  const siteId = params.siteId ?? 'MLB';

  const query: Record<string, string> = {
    q: params.q,
    limit: String(params.limit ?? 50),
    offset: String(params.offset ?? 0),
  };
  if (params.categoryId) query['category'] = params.categoryId;

  const res = await got
    .get(`${SEARCH_ENDPOINT}/${siteId}/search`, {
      headers: { Authorization: `Bearer ${token}` },
      searchParams: query,
      responseType: 'json',
      timeout: { request: 20_000 },
      retry: { limit: 2, statusCodes: [429, 500, 502, 503, 504] },
    })
    .json<unknown>();

  return MlSearchResponse.parse(res);
}
