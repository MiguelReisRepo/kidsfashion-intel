import { z } from 'zod';

export const MlOAuthResponse = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  scope: z.string().optional(),
  user_id: z.number().optional(),
});
export type MlOAuthResponse = z.infer<typeof MlOAuthResponse>;

const MlInstallment = z.object({
  quantity: z.number(),
  amount: z.number(),
  rate: z.number(),
  currency_id: z.string(),
});

const MlShipping = z.object({
  free_shipping: z.boolean().optional(),
  mode: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const MlAddress = z.object({
  state_id: z.string().optional(),
  state_name: z.string().optional(),
  city_id: z.string().optional(),
  city_name: z.string().optional(),
});

const MlSeller = z.object({
  id: z.number().optional(),
  nickname: z.string().optional(),
  car_dealer: z.boolean().optional(),
  real_estate_agency: z.boolean().optional(),
});

const MlAttribute = z.object({
  id: z.string(),
  name: z.string().optional(),
  value_id: z.string().nullable().optional(),
  value_name: z.string().nullable().optional(),
});

export const MlItem = z.object({
  id: z.string(),
  title: z.string(),
  condition: z.string().optional(),
  permalink: z.string().url(),
  thumbnail: z.string().url().optional(),
  pictures: z.array(z.object({ url: z.string().url() })).optional(),
  currency_id: z.string(),
  price: z.number(),
  original_price: z.number().nullable().optional(),
  available_quantity: z.number().optional(),
  sold_quantity: z.number().optional(),
  buying_mode: z.string().optional(),
  listing_type_id: z.string().optional(),
  stop_time: z.string().optional(),
  category_id: z.string().optional(),
  domain_id: z.string().optional(),
  seller: MlSeller.optional(),
  address: MlAddress.optional(),
  shipping: MlShipping.optional(),
  installments: MlInstallment.optional(),
  attributes: z.array(MlAttribute).optional(),
});
export type MlItem = z.infer<typeof MlItem>;

export const MlSearchResponse = z.object({
  site_id: z.string(),
  query: z.string().optional(),
  paging: z.object({
    total: z.number(),
    primary_results: z.number().optional(),
    offset: z.number().optional(),
    limit: z.number().optional(),
  }),
  results: z.array(MlItem),
});
export type MlSearchResponse = z.infer<typeof MlSearchResponse>;
