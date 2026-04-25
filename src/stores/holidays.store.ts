import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Holiday } from '@models/holiday';
import { asyncStorageAdapter } from '@services/cache/asyncStorage';

interface HolidaysState {
  /** Holidays from API/fallback, indexed by year string. */
  byYear: Record<string, Holiday[]>;
  /** User overrides: holidays added by the user (date → name). */
  userAdded: Record<string, string>;
  /** User overrides: holidays removed by the user (date set). */
  userRemoved: Record<string, boolean>;
  setHolidays(year: number, holidays: Holiday[]): void;
  addUserHoliday(date: string, name: string): void;
  removeUserHoliday(date: string): void;
  restoreHoliday(date: string): void;
  resetUserOverrides(): void;
}

/** Merge API holidays with user overrides for a given year. */
export const getMergedHolidays = (
  apiHolidays: Holiday[],
  userAdded: Record<string, string>,
  userRemoved: Record<string, boolean>,
): Holiday[] => {
  // Start with API holidays, remove user-removed ones
  const base = apiHolidays.filter((h) => !userRemoved[h.date]);
  // Add user-added holidays
  const added: Holiday[] = Object.entries(userAdded).map(([date, name]) => ({ date, name }));
  // Merge and sort by date
  return [...base, ...added].sort((a, b) => a.date.localeCompare(b.date));
};

export const useHolidaysStore = create<HolidaysState>()(
  persist(
    (set) => ({
      byYear: {},
      userAdded: {},
      userRemoved: {},
      setHolidays: (year, holidays) =>
        set((state) => ({ byYear: { ...state.byYear, [String(year)]: holidays } })),
      addUserHoliday: (date, name) =>
        set((state) => {
          const added = { ...state.userAdded, [date]: name };
          // If it was previously removed from API list, un-remove it
          const removed = { ...state.userRemoved };
          delete removed[date];
          return { userAdded: added, userRemoved: removed };
        }),
      removeUserHoliday: (date) =>
        set((state) => {
          // If it's a user-added holiday, just delete it
          const added = { ...state.userAdded };
          if (added[date] != null) {
            delete added[date];
            return { userAdded: added };
          }
          // Otherwise mark API holiday as removed
          return { userRemoved: { ...state.userRemoved, [date]: true } };
        }),
      restoreHoliday: (date) =>
        set((state) => {
          const removed = { ...state.userRemoved };
          delete removed[date];
          return { userRemoved: removed };
        }),
      resetUserOverrides: () => set({ userAdded: {}, userRemoved: {} }),
    }),
    {
      name: 'holidays-cache-v1',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (state) => ({
        byYear: state.byYear,
        userAdded: state.userAdded,
        userRemoved: state.userRemoved,
      }),
    },
  ),
);
