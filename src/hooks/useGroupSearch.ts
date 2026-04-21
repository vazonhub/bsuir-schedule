import { useDeferredValue, useMemo, useState } from 'react';

import type { StudentGroupDto } from '@models/dto';

/** All searchable fields of a group, pre-lowercased, plus course as string. */
const getSearchFields = (g: StudentGroupDto): string[] => [
  g.name.toLowerCase(),
  g.facultyAbbrev.toLowerCase(),
  g.facultyName.toLowerCase(),
  g.specialityAbbrev.toLowerCase(),
  g.specialityName.toLowerCase(),
  String(g.course),
];

const tokenMatchesGroup = (token: string, fields: string[]): boolean =>
  fields.some((f) => f.includes(token));

/**
 * Multi-token search: every token in the query must match at least one field.
 * Supports mixed queries like "иэф ээ 3 курс".
 * The word "курс" is stripped as noise.
 */
const matches = (group: StudentGroupDto, tokens: string[]): boolean => {
  const fields = getSearchFields(group);
  return tokens.every((t) => tokenMatchesGroup(t, fields));
};

export interface UseGroupSearchResult {
  query: string;
  setQuery(value: string): void;
  /** True when the (deferred) query is non-empty. */
  isSearching: boolean;
  /** Filtered + sorted-by-name list. When not searching, returns the input as-is. */
  filtered: StudentGroupDto[];
}

/**
 * Search hook for the groups list. Uses `useDeferredValue` to keep typing
 * snappy on large lists (≈400 groups today).
 *
 * When the trimmed query is non-empty we return a flat alphabetically-sorted
 * list of matches. When empty we return the original `items` reference so
 * downstream `useMemo`s based on `items` stay stable.
 */
export const useGroupSearch = (items: StudentGroupDto[]): UseGroupSearchResult => {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const trimmed = deferredQuery.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!trimmed) return items;
    const tokens = trimmed.split(/\s+/).filter((t) => t && t !== 'курс');
    if (tokens.length === 0) return items;
    return items
      .filter((g) => matches(g, tokens))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, trimmed]);

  return {
    query,
    setQuery,
    isSearching: trimmed.length > 0,
    filtered,
  };
};
