import { useDeferredValue, useMemo, useState } from 'react';

import type { EmployeeDto } from '@models/dto';
import { buildSearchIndex, fuzzyFilter } from '@utils/fuzzySearch';

const getSearchableFields = (e: EmployeeDto): Array<string | null | undefined> => [
  e.lastName,
  e.firstName,
  e.middleName,
  e.fio,
  e.rank,
  ...(e.academicDepartment ?? []),
];

export interface UseEmployeeSearchResult {
  query: string;
  setQuery(value: string): void;
  /** True when the (deferred) query is non-empty. */
  isSearching: boolean;
  /** Filtered list. When not searching, returns the input as-is. */
  filtered: EmployeeDto[];
}

/**
 * Search hook for the employees list.
 *
 * - Tokenises the query on whitespace, so multi-word queries like
 *   "Алексее Игорь" find "Алексеев Игорь Геннадьевич" (each token matches a
 *   different field word).
 * - Uses bigram-based fuzzy matching → tolerates typos / missing letters.
 * - Builds a per-word search index once per `items[]` change, so subsequent
 *   queries are cheap. Combined with `useDeferredValue` keeps typing snappy
 *   even on the full ≈800-employee list.
 */
export const useEmployeeSearch = (items: EmployeeDto[]): UseEmployeeSearchResult => {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const index = useMemo(() => buildSearchIndex(items, getSearchableFields), [items]);

  const trimmedDeferred = deferredQuery.trim();

  const filtered = useMemo(() => {
    if (!trimmedDeferred) return items;
    return fuzzyFilter(index, trimmedDeferred);
  }, [items, index, trimmedDeferred]);

  return {
    query,
    setQuery,
    isSearching: trimmedDeferred.length > 0,
    filtered,
  };
};
