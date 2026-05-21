import { z } from 'zod';

export const SourceName = z.enum([
  'ebay',
  'aliexpress',
  'amazon',
  'mercadolivre',
  'olx-pt',
  'depop',
  'grailed',
  'custojusto',
  'catawiki',
]);
export type SourceName = z.infer<typeof SourceName>;

export const KitType = z.enum([
  'home',
  'away',
  'third',
  'training',
  'retro',
  'goalkeeper',
  'fan',
  'special',
]);
export type KitType = z.infer<typeof KitType>;

export const GenderAge = z.enum(['kids', 'adult', 'unisex']);
export type GenderAge = z.infer<typeof GenderAge>;

export const Version = z.enum(['adepto', 'player', 'authentic']);
export type Version = z.infer<typeof Version>;

export const Condition = z.enum(['new', 'like_new', 'good', 'fair', 'poor']);
export type Condition = z.infer<typeof Condition>;

export const Recommendation = z.enum(['STOCK', 'HOLD', 'RAISE', 'SKIP', 'LIQUIDATE']);
export type Recommendation = z.infer<typeof Recommendation>;

export const Listing = z.object({
  external_id: z.string().min(1),
  source: SourceName,
  url: z.string().url(),

  title_raw: z.string(),
  description: z.string().optional(),

  team_slug: z.string().optional(),
  team_display: z.string().optional(),
  season: z.string().optional(),
  kit_type: KitType.optional(),
  gender_age: GenderAge.optional(),
  sizes: z.array(z.string()),
  brand: z.string().optional(),

  condition: Condition.optional(),
  price_value: z.number().nonnegative(),
  price_currency: z.string().length(3),
  price_eur: z.number().nonnegative(),
  shipping_eur: z.number().nonnegative().optional(),

  country: z.string().length(2).optional(),
  city: z.string().optional(),

  seller_id: z.string().optional(),
  seller_rating: z.number().min(0).max(5).optional(),

  photos: z.array(z.string().url()),

  listed_at: z.string().datetime().optional(),
  first_seen_at: z.string().datetime(),
  last_seen_at: z.string().datetime(),
  sold_at: z.string().datetime().optional(),

  sku_id: z.string().uuid().optional(),
  match_confidence: z.number().min(0).max(1),
});
export type Listing = z.infer<typeof Listing>;

export const CatalogSku = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  external_id: z.string(),
  name_pt: z.string(),
  name_en: z.string(),
  team_slug: z.string(),
  team_display: z.string(),
  season: z.string(),
  kit_type: KitType,
  version: Version,
  gender_age: GenderAge,
  sizes: z.array(z.string()),
  retail_price_eur: z.number().nonnegative().nullable(),
  in_stock: z.boolean(),
  is_featured: z.boolean().default(false),
  is_clearance: z.boolean().default(false),
});
export type CatalogSku = z.infer<typeof CatalogSku>;

export const ProductSeed = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.object({ pt: z.string(), en: z.string() }),
  team: z.string(),
  season: z.string(),
  kitType: KitType,
  version: Version,
  audience: z.enum(['kids', 'adult']),
  price: z.number().nonnegative(),
  sizes: z.array(z.string()),
  availability: z.string(),
  shippingDays: z.number().int().optional(),
  images: z.array(z.string()),
  description: z.object({ pt: z.string(), en: z.string() }).optional(),
  isFeatured: z.boolean().optional(),
  isClearance: z.boolean().optional(),
});
export type ProductSeed = z.infer<typeof ProductSeed>;
