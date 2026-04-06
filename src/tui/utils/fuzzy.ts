/**
 * Fuzzy matching engine with contiguous substring matching.
 *
 * Only matches when query appears as-is in the haystack (case-insensitive).
 * Scoring:
 *   +20 bonus for match at start of string
 *   +10 bonus for match at a word boundary (-, _, /, .)
 *   -N  penalty for later position in string
 */

export interface FuzzyMatchResult<T> {
  item: T;
  score: number;
  matchIndices: number[];
}

export function fuzzyMatch<T>(
  query: string,
  items: T[],
  getText: (item: T) => string
): FuzzyMatchResult<T>[] {
  if (!query) {
    return items.map((item) => ({ item, score: 0, matchIndices: [] }));
  }

  const q = query.toLowerCase();

  // Phase 1: contiguous substring matches
  const substringResults: FuzzyMatchResult<T>[] = [];
  for (const item of items) {
    const haystack = getText(item).toLowerCase();
    const idx = haystack.indexOf(q);
    if (idx >= 0) {
      const indices = Array.from({ length: q.length }, (_, i) => idx + i);
      let score = 100; // base score for substring match
      // Bonus for match at start of string
      if (idx === 0) score += 20;
      // Bonus for match at word boundary
      if (idx > 0 && WORD_BOUNDARIES.has(haystack[idx - 1])) score += 10;
      // Penalty for later position
      score -= idx;
      substringResults.push({ item, score, matchIndices: indices });
    }
  }

  if (substringResults.length > 0) {
    substringResults.sort((a, b) => b.score - a.score);
    return substringResults.slice(0, 10);
  }

  return [];
}

const WORD_BOUNDARIES = new Set(['-', '_', '/', '.', ' ']);
