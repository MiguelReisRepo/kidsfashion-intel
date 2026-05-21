import { z } from 'zod';

const VintedPrice = z
  .object({
    amount: z.union([z.string(), z.number()]),
    currency_code: z.string(),
  })
  .transform((p) => ({
    amount: typeof p.amount === 'string' ? Number.parseFloat(p.amount) : p.amount,
    currency_code: p.currency_code,
  }));

const VintedPhoto = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  url: z.string().optional(),
  full_size_url: z.string().optional(),
});

const VintedUser = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  login: z.string().optional(),
  business: z.boolean().optional(),
  country_code: z.string().optional(),
  feedback_reputation: z.number().optional(),
});

export const VintedItem = z.object({
  id: z.union([z.number(), z.string()]),
  title: z.string(),
  url: z.string().url(),
  brand_title: z.string().optional().nullable(),
  size_title: z.string().optional().nullable(),
  status: z.string().optional(),
  price: VintedPrice.optional(),
  // Some endpoints flatten `total_item_price` instead of `price`; tolerate both.
  total_item_price: VintedPrice.optional(),
  service_fee: VintedPrice.optional(),
  catalog_id: z.union([z.number(), z.string()]).optional(),
  photo: VintedPhoto.nullable().optional(),
  user: VintedUser.optional(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  favourite_count: z.number().optional(),
  view_count: z.number().optional(),
});
export type VintedItem = z.infer<typeof VintedItem>;

export const VintedSearchResponse = z.object({
  items: z.array(VintedItem),
  pagination: z
    .object({
      current_page: z.number().optional(),
      total_pages: z.number().optional(),
      total_entries: z.number().optional(),
      per_page: z.number().optional(),
    })
    .optional(),
});
export type VintedSearchResponse = z.infer<typeof VintedSearchResponse>;
