import { z } from 'zod';

// OLX.pt params are heterogeneous — each entry has its own value shape keyed by `type`.
// We tolerate any value shape and decode known keys downstream.
const OlxParam = z.object({
  key: z.string(),
  name: z.string().optional(),
  type: z.string().optional(),
  value: z.unknown(),
});

const OlxPhoto = z.object({
  id: z.number(),
  filename: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  link: z.string(),
});

const OlxUser = z.object({
  id: z.number(),
  uuid: z.string().optional(),
  name: z.string().optional(),
  created: z.string().optional(),
  business: z.boolean().optional(),
});

const OlxLocation = z.object({
  city: z.object({ id: z.number().optional(), name: z.string().optional() }).optional(),
  region: z.object({ id: z.number().optional(), name: z.string().optional() }).optional(),
});

const OlxPromotion = z.object({
  highlighted: z.boolean().optional(),
  urgent: z.boolean().optional(),
  top_ad: z.boolean().optional(),
});

export const OlxOffer = z.object({
  id: z.number(),
  url: z.string().url(),
  title: z.string(),
  description: z.string().optional().nullable(),
  created_time: z.string(),
  last_refresh_time: z.string().optional(),
  valid_to_time: z.string().optional(),
  status: z.string().optional(),
  business: z.boolean().optional(),
  promotion: OlxPromotion.optional(),
  params: z.array(OlxParam).default([]),
  user: OlxUser.optional(),
  location: OlxLocation.optional(),
  photos: z.array(OlxPhoto).default([]),
});
export type OlxOffer = z.infer<typeof OlxOffer>;

export const OlxSearchResponse = z.object({
  data: z.array(OlxOffer),
  metadata: z
    .object({
      total_elements: z.number().optional(),
      visible_total_count: z.number().optional(),
    })
    .optional(),
});
export type OlxSearchResponse = z.infer<typeof OlxSearchResponse>;

/** Param value shapes we care about (decoded ad-hoc in normalize). */
export interface OlxPriceValue {
  value: number;
  currency: string;
  previous_value?: number | null;
  negotiable?: boolean;
  label?: string;
}

export interface OlxSelectValue {
  key: string;
  label: string;
}
