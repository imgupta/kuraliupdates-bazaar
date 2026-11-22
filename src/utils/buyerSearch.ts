const SYNONYMS: Record<string, string[]> = {
  milk: ['milk', 'doodh', 'dudh', 'दूध', 'ਦੁੱਧ'],
  rice: ['rice', 'chawal', 'चावल', 'ਚਾਵਲ'],
  flour: ['flour', 'atta', 'आटा', 'ਆਟਾ'],
  onion: ['onion', 'pyaz', 'pyaaz', 'प्याज', 'ਪਿਆਜ਼'],
  potato: ['potato', 'aloo', 'आलू', 'ਆਲੂ'],
  tomato: ['tomato', 'tamatar', 'टमाटर', 'ਟਮਾਟਰ'],
  sugar: ['sugar', 'cheeni', 'चीनी', 'ਖੰਡ', 'ਚੀਨੀ'],
  tea: ['tea', 'chai', 'चाय', 'ਚਾਹ'],
  ghee: ['ghee', 'घी', 'ਘਿਓ'],
  curd: ['curd', 'yogurt', 'dahi', 'दही', 'ਦਹੀਂ'],
  bread: ['bread', 'roti', 'ब्रेड', 'रोटी', 'ਰੋਟੀ'],
  lentils: ['lentils', 'dal', 'दाल', 'ਦਾਲ'],
  spices: ['spices', 'masala', 'मसाला', 'ਮਸਾਲਾ'],
  soap: ['soap', 'sabun', 'साबुन', 'ਸਾਬਣ'],
  detergent: ['detergent', 'washing powder', 'surf', 'डिटर्जेंट', 'ਸਰਫ'],
};

const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase('en-IN')
  .replace(/[.,/#!$%^&*;:{}=\-_\u2013\u2014?~()]/g, ' ')
  .replace(/\s+/g, ' ').trim();

export function expandBuyerSearchQuery(query: string): string[] {
  const normalized = normalize(query);
  if (!normalized) return [];
  const terms = new Set<string>([normalized]);
  const tokens = normalized.split(' ').filter(Boolean);
  for (const [canonical, aliases] of Object.entries(SYNONYMS)) {
    if (aliases.some(alias => normalize(alias) === normalized || tokens.includes(normalize(alias)))) {
      terms.add(canonical);
      for (const alias of aliases) terms.add(normalize(alias));
    }
  }
  return Array.from(terms);
}

export function matchesBuyerSearch(query: string, values: Array<string | null | undefined>): boolean {
  const terms = expandBuyerSearchQuery(query);
  if (!terms.length) return true;
  const haystack = normalize(values.filter(Boolean).join(' '));
  return terms.some(term => haystack.includes(term));
}
