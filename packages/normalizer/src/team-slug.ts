// Normalize a team display name to a stable slug.
// Used both for catalog_sku.team_slug and for matching marketplace listing titles.

const REMOVE_TOKENS = [
  'fc', 'cf', 'cp', 'sc', 'rc', 'ac', 'ad', 'as', 'sl',
  'club', 'clube', 'sport', 'sporting', // careful: 'sporting' kept as slug below
  'futebol', 'football', 'soccer',
  'de', 'da', 'do', 'di', 'la', 'le', 'el',
];

const EXPLICIT_SLUGS: Record<string, string> = {
  'fc barcelona': 'barcelona',
  'barcelona': 'barcelona',
  'real madrid': 'real-madrid',
  'atletico madrid': 'atletico-madrid',
  'atlético madrid': 'atletico-madrid',
  'manchester united': 'man-united',
  'manchester utd': 'man-united',
  'man united': 'man-united',
  'manchester city': 'man-city',
  'man city': 'man-city',
  'paris saint-germain': 'psg',
  'paris saint germain': 'psg',
  'psg': 'psg',
  'inter milan': 'inter',
  'inter': 'inter',
  'ac milan': 'ac-milan',
  'milan': 'ac-milan',
  'juventus': 'juventus',
  'bayern munich': 'bayern',
  'bayern münchen': 'bayern',
  'borussia dortmund': 'dortmund',
  'olympique lyon': 'lyon',
  'olympique lyonnais': 'lyon',
  'olympique marseille': 'marseille',
  'olympique de marseille': 'marseille',
  'benfica': 'benfica',
  'sl benfica': 'benfica',
  'sporting': 'sporting',
  'sporting cp': 'sporting',
  'sporting lisbon': 'sporting',
  'sporting clube de portugal': 'sporting',
  'porto': 'porto',
  'fc porto': 'porto',
  'braga': 'braga',
  'sc braga': 'braga',
  'sporting braga': 'braga',
  'seleção nacional': 'portugal',
  'selecao nacional': 'portugal',
  'portugal': 'portugal',
  'brasil': 'brazil',
  'brazil': 'brazil',
  'inglaterra': 'england',
  'england': 'england',
  'itália': 'italy',
  'italia': 'italy',
  'italy': 'italy',
  'espanha': 'spain',
  'españa': 'spain',
  'spain': 'spain',
  'bélgica': 'belgium',
  'belgica': 'belgium',
  'belgium': 'belgium',
  'colômbia': 'colombia',
  'colombia': 'colombia',
  'jamaica': 'jamaica',
  'japão': 'japan',
  'japao': 'japan',
  'japan': 'japan',
  'cabo verde': 'cape-verde',
  'cape verde': 'cape-verde',
  'estados unidos': 'usa',
  'united states': 'usa',
  'usa': 'usa',
  'flamengo': 'flamengo',
  'corinthians': 'corinthians',
  'palmeiras': 'palmeiras',
  'santos': 'santos',
  'grémio': 'gremio',
  'gremio': 'gremio',
  'botafogo': 'botafogo',
  'atlético mineiro': 'atletico-mineiro',
  'atletico mineiro': 'atletico-mineiro',
  'boca juniors': 'boca',
  'river plate': 'river',
  'inter miami': 'inter-miami',
  'arsenal': 'arsenal',
  'chelsea': 'chelsea',
  'golden state warriors': 'warriors',
  'gsw': 'warriors',
};

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function teamSlug(displayName: string): string {
  const lower = stripDiacritics(displayName.trim().toLowerCase());
  if (EXPLICIT_SLUGS[lower]) return EXPLICIT_SLUGS[lower];

  // Fallback: kebab-case after stripping noise tokens
  const cleaned = lower
    .split(/[\s\-_./]+/)
    .filter((tok) => tok.length > 0 && !REMOVE_TOKENS.includes(tok))
    .join('-');

  return cleaned || lower.replace(/[^a-z0-9]+/g, '-');
}

// Produce additional aliases for a team — useful for team_aliases seeding.
export function teamAliases(displayName: string, slug: string): string[] {
  const lower = stripDiacritics(displayName.trim().toLowerCase());
  const aliases = new Set<string>([lower]);

  // Inverse lookup: any EXPLICIT_SLUGS key that maps to this slug
  for (const [key, value] of Object.entries(EXPLICIT_SLUGS)) {
    if (value === slug) aliases.add(key);
  }

  return [...aliases];
}
