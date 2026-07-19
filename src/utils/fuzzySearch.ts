/**
 * Lightweight fuzzy search built around character bigrams + Dice coefficient.
 *
 * Two-stage matching for each query token:
 *   1. Substring fast-path against indexed words (catches exact prefixes,
 *      contains-matches, and very short queries).
 *   2. Bigram-based fuzzy match for tokens of ≥ 3 chars — handles typos like
 *      "Алексее" → "Алексеев" or "Семёнов" → "Семенов".
 *
 * Multi-word queries are tokenised on whitespace; an item must satisfy ALL
 * tokens (each token may match a different field/word). This is what lets
 * "Алексее Игорь" find "Алексеев Игорь Геннадьевич".
 */

const FUZZY_THRESHOLD = 0.55;
const FUZZY_MIN_TOKEN_LENGTH = 3;

/** Lowercase + collapse Cyrillic ё→е so search treats "Семёнов"=="Семенов". */
export const normalizeForSearch = (s: string): string => s.toLowerCase().replace(/ё/g, 'е');

export const tokenize = (s: string): string[] => normalizeForSearch(s).split(/\s+/).filter(Boolean);

const bigrams = (s: string): Set<string> => {
  const set = new Set<string>();
  if (s.length < 2) return set;
  for (let i = 0; i < s.length - 1; i++) {
    set.add(s.slice(i, i + 2));
  }
  return set;
};

const diceSimilarity = (a: Set<string>, b: Set<string>): number => {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  return (2 * intersection) / (a.size + b.size);
};

/**
 * Pre-built per-item index. Construct once per items[] change via
 * `buildSearchIndex` and feed into `fuzzyFilter` for each query.
 */
export interface SearchIndexEntry<T> {
  raw: T;
  /** All normalised words extracted from item's searchable fields. */
  words: string[];
  /** Cached bigram sets for `words[i]`. */
  wordBigrams: Set<string>[];
}

export const buildSearchIndex = <T>(
  items: T[],
  getFields: (item: T) => Array<string | null | undefined>,
): Array<SearchIndexEntry<T>> => {
  const result: Array<SearchIndexEntry<T>> = [];
  for (const raw of items) {
    const words: string[] = [];
    for (const field of getFields(raw)) {
      if (!field) continue;
      for (const word of tokenize(field)) {
        words.push(word);
      }
    }
    result.push({ raw, words, wordBigrams: words.map(bigrams) });
  }
  return result;
};

/**
 * Score a single token against an entry. Returns 0 if no match.
 * Higher = better:
 *   3 — exact word match
 *   2 — prefix match (word starts with token)
 *   1 — substring match (token found inside word)
 *   0.1..0.99 — fuzzy bigram score (dice coefficient)
 */
const tokenScoreEntry = <T>(entry: SearchIndexEntry<T>, token: string): number => {
  let best = 0;
  for (const word of entry.words) {
    if (word === token) return 3; // exact — short-circuit
    if (word.startsWith(token)) {
      best = Math.max(best, 2);
      continue;
    }
    if (word.includes(token)) {
      best = Math.max(best, 1);
      continue;
    }
  }
  if (best > 0) return best;
  // Fuzzy bigram match for longer tokens — handles typos / transpositions.
  if (token.length >= FUZZY_MIN_TOKEN_LENGTH) {
    const queryBigrams = bigrams(token);
    for (const wordBigram of entry.wordBigrams) {
      const dice = diceSimilarity(queryBigrams, wordBigram);
      if (dice >= FUZZY_THRESHOLD) best = Math.max(best, dice);
    }
  }
  return best;
};

export const fuzzyFilter = <T>(index: Array<SearchIndexEntry<T>>, query: string): T[] => {
  const tokens = tokenize(query);
  if (tokens.length === 0) return index.map((e) => e.raw);
  const scored: Array<{ raw: T; score: number }> = [];
  for (const entry of index) {
    let totalScore = 0;
    let allMatch = true;
    for (const token of tokens) {
      const s = tokenScoreEntry(entry, token);
      if (s === 0) {
        allMatch = false;
        break;
      }
      totalScore += s;
    }
    if (allMatch) scored.push({ raw: entry.raw, score: totalScore });
  }
  // Sort by total score descending — exact/prefix matches float to the top.
  scored.sort((a, b) => b.score - a.score);
  return scored.map((e) => e.raw);
};
