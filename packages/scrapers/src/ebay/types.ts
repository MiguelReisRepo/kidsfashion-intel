import { z } from 'zod';

export const EbayOAuthResponse = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
});
export type EbayOAuthResponse = z.infer<typeof EbayOAuthResponse>;

export const EbayItemPrice = z.object({
  value: z.string(),
  currency: z.string(),
});

export const EbayItemImage = z.object({
  imageUrl: z.string().url().optional(),
});

export const EbayItemSeller = z.object({
  username: z.string().optional(),
  feedbackScore: z.number().optional(),
  feedbackPercentage: z.string().optional(),
});

export const EbayItemLocation = z.object({
  country: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
});

export const EbayItemShipping = z.object({
  shippingCost: EbayItemPrice.optional(),
  shippingCostType: z.string().optional(),
});

export const EbayItemSummary = z.object({
  itemId: z.string(),
  title: z.string(),
  price: EbayItemPrice,
  itemWebUrl: z.string().url(),
  itemHref: z.string().url().optional(),
  itemLocation: EbayItemLocation.optional(),
  seller: EbayItemSeller.optional(),
  condition: z.string().optional(),
  conditionId: z.string().optional(),
  image: EbayItemImage.optional(),
  thumbnailImages: z.array(EbayItemImage).optional(),
  additionalImages: z.array(EbayItemImage).optional(),
  shippingOptions: z.array(EbayItemShipping).optional(),
  itemCreationDate: z.string().optional(),
  categories: z
    .array(z.object({ categoryId: z.string(), categoryName: z.string().optional() }))
    .optional(),
  buyingOptions: z.array(z.string()).optional(),
});
export type EbayItemSummary = z.infer<typeof EbayItemSummary>;

export const EbaySearchResponse = z.object({
  itemSummaries: z.array(EbayItemSummary).optional(),
  total: z.number().optional(),
  next: z.string().url().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});
export type EbaySearchResponse = z.infer<typeof EbaySearchResponse>;
