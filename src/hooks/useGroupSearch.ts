import { useDeferredValue, useMemo, useState } from 'react';

import type { StudentGroupDto } from '@models/dto';

const matches = (group: StudentGroupDto, query: string): boolean =>
  group.name.toLowerCase().includes(query) ||
  group.facultyAbbrev.toLowerCase().includes(query) ||
  group.facultyName.toLowerCase().includes(query) ||
  group.specialityAbbrev.toLowerCase().includes(query) ||
  group.specialityName.toLowerCase().includes(query);

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
    return items
      .filter((g) => matches(g, trimmed))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, trimmed]);

  return {
    query,
    setQuery,
    isSearching: trimmed.length > 0,
    filtered,
  };
};
