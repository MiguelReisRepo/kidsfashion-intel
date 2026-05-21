import type { GenderAge } from '@kfi/shared';

const KIDS_TOKENS = [
  'kids',
  'kid',
  'youth',
  'junior',
  'jr',
  'criança',
  'crianca',
  'child',
  'children',
  'niño',
  'nino',
  'niños',
  'bambino',
  'enfant',
];

export function detectGenderAge(text: string): GenderAge | undefined {
  const lower = text.toLowerCase();
  if (KIDS_TOKENS.some((tok) => new RegExp(`\\b${tok}\\b`).test(lower))) {
    return 'kids';
  }
  if (/\b(adult|adulto|mens?|home)\b/i.test(text)) return 'adult';
  return undefined;
}
