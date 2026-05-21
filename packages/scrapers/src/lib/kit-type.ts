import type { KitType } from '@kfi/shared';

// Multi-language keyword detection for kit_type.
// Order matters: more specific patterns checked first.
const RULES: Array<{ kit: KitType; tokens: string[] }> = [
  { kit: 'goalkeeper', tokens: ['goalkeeper', 'guarda-redes', 'guarda redes', 'portero', 'portiere'] },
  { kit: 'training', tokens: ['training', 'treino', 'entreno', 'allenamento', 'entrenamiento'] },
  { kit: 'retro', tokens: ['retro', 'vintage', 'classica', 'clássica', 'clasica', 'classic'] },
  { kit: 'third', tokens: ['third', 'terceira', 'tercera', 'terza'] },
  { kit: 'away', tokens: ['away', 'visitante', 'visitor', 'fuera', 'trasferta', 'alternative'] },
  { kit: 'home', tokens: ['home', 'principal', 'casa', 'primera', 'primary', 'gara'] },
  { kit: 'special', tokens: ['special', 'limited', 'edition', 'comemorativ', 'limitad'] },
  { kit: 'fan', tokens: ['fan version', 'adepto', 'replica', 'réplica'] },
];

export function detectKitType(text: string): KitType | undefined {
  const lower = text.toLowerCase();
  for (const rule of RULES) {
    if (rule.tokens.some((tok) => lower.includes(tok))) return rule.kit;
  }
  return undefined;
}
