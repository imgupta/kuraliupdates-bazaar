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
  .replace(/[.,/#!$%^&*;:{}=\\-_\\u2013\\u2014?~()]/g, ' ')
  .replace(/\\s+/g, ' ').trim();

export function expandBuyerSearchQuery(query: string): string[][] {
  return normalize(query).split(' ').filter(Boolean).map(token => {
    const match = Object.entries(SYNONYMS).find(([canonical, aliases]) =>
      canonical === token || aliases.some(alias => normalize(alias) === token));
    return match ? Array.from(new Set([match[0], ...match[1]].map(normalize))) : [token];
  });
}

export function matchesBuyerSearch(query: string, values: Array<string | null | undefined>): boolean {
  const groups = expandBuyerSearchQuery(query);
  if (!groups.length) return true;
  const haystack = normalize(values.filter(Boolean).join(' '));
  // Every query token must match; synonyms expand alternatives only within that token.
  return groups.every(alternatives => alternatives.some(term => haystack.includes(term)));
}
