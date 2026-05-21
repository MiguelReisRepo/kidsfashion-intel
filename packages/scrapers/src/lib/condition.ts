import type { Condition } from '@kfi/shared';

const CONDITION_MAP: Record<string, Condition> = {
  new: 'new',
  brand_new: 'new',
  new_with_tags: 'new',
  'brand new': 'new',
  'new with tags': 'new',
  novo: 'new',
  nuevo: 'new',
  nuovo: 'new',
  neuf: 'new',
  new_other: 'like_new',
  'new other': 'like_new',
  used: 'good',
  pre_owned: 'good',
  'pre-owned': 'good',
  good: 'good',
  used_good: 'good',
  excellent: 'like_new',
  'very good': 'good',
  fair: 'fair',
  acceptable: 'fair',
  worn: 'fair',
  poor: 'poor',
};

export function normalizeCondition(raw: string | undefined): Condition | undefined {
  if (!raw) return undefined;
  const key = raw.toLowerCase().trim().replace(/\s+/g, ' ');
  return CONDITION_MAP[key];
}
