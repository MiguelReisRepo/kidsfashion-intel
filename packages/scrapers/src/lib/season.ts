// Parse season strings out of free-form titles.
// Returns canonical 'YYYY' or 'YYYY/YY' format (matches what KFC seed.ts uses).

const PATTERNS: Array<{ regex: RegExp; build: (m: RegExpExecArray) => string }> = [
  // 2024/2025, 2024-2025
  { regex: /\b(20\d{2})[/-](20\d{2})\b/, build: (m) => `${m[1]}/${m[2]?.slice(2)}` },
  // 2024/25, 2024-25
  { regex: /\b(20\d{2})[/-](\d{2})\b/, build: (m) => `${m[1]}/${m[2]}` },
  // 24/25, 24-25 (assume current century)
  { regex: /\b(\d{2})[/-](\d{2})\b/, build: (m) => `20${m[1]}/${m[2]}` },
  // bare 4-digit year
  { regex: /\b(20\d{2})\b/, build: (m) => m[1] ?? '' },
];

export function parseSeason(text: string): string | undefined {
  for (const { regex, build } of PATTERNS) {
    const match = regex.exec(text);
    if (match) {
      const out = build(match);
      if (out) return out;
    }
  }
  return undefined;
}
