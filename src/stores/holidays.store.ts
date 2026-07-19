import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Holiday } from '@models/holiday';
import { asyncStorageAdapter } from '@services/cache/asyncStorage';

/** Unique key for a user-added holiday (supports multiple per date). */
const userKey = (date: string, name: string) => `${date}|${name}`;

interface HolidaysState {
  /** Holidays from API/fallback, indexed by year string. */
  byYear: Record<string, Holiday[]>;
  /** User-added holidays: date → list of names (supports multiple per date). */
  userAdded: Record<string, string[]>;
  /** Hidden API holidays (date set). */
  userRemoved: Record<string, boolean>;
  /** Hidden user-added holidays (key = "date|name"). */
  userAddedHidden: Record<string, boolean>;
  setHolidays(year: number, holidays: Holiday[]): void;
  addUserHoliday(date: string, name: string): void;
  deleteUserHoliday(date: string, name: string): void;
  /** Toggle hide for any holiday. API holidays use userRemoved, custom use userAddedHidden. */
  toggleHideHoliday(date: string, name: string, isUserAdded: boolean): void;
  resetUserOverrides(): void;
}

/** Merge API holidays with user overrides for a given year. */
export const getMergedHolidays = (
  apiHolidays: Holiday[],
  userAdded: Record<string, string[]>,
  userRemoved: Record<string, boolean>,
  userAddedHidden?: Record<string, boolean>,
): Holiday[] => {
  // Start with API holidays, remove user-removed ones
  const base = apiHolidays.filter((h) => !userRemoved[h.date]);
  // Add user-added holidays (skip hidden ones)
  const added: Holiday[] = [];
  for (const [date, names] of Object.entries(userAdded)) {
    for (const name of names) {
      if (!userAddedHidden?.[userKey(date, name)]) {
        added.push({ date, name });
      }
    }
  }
  // Merge and sort by date
  return [...base, ...added].sort((a, b) => a.date.localeCompare(b.date));
};

export const useHolidaysStore = create<HolidaysState>()(
  persist(
    (set) => ({
      byYear: {},
      userAdded: {},
      userRemoved: {},
      userAddedHidden: {},
      setHolidays: (year, holidays) =>
        set((state) => ({ byYear: { ...state.byYear, [String(year)]: holidays } })),
      addUserHoliday: (date, name) =>
        set((state) => {
          const list = [...(state.userAdded[date] ?? [])];
          if (!list.includes(name)) list.push(name);
          return { userAdded: { ...state.userAdded, [date]: list } };
        }),
      deleteUserHoliday: (date, name) =>
        set((state) => {
          const list = (state.userAdded[date] ?? []).filter((n) => n !== name);
          const added = { ...state.userAdded };
          if (list.length === 0) {
            delete added[date];
          } else {
            added[date] = list;
          }
          // Also clean up hidden state
          const hidden = { ...state.userAddedHidden };
          delete hidden[userKey(date, name)];
          return { userAdded: added, userAddedHidden: hidden };
        }),
      toggleHideHoliday: (date, name, isUserAdded) =>
        set((state) => {
          if (isUserAdded) {
            const key = userKey(date, name);
            const hidden = { ...state.userAddedHidden };
            if (hidden[key]) {
              delete hidden[key];
            } else {
              hidden[key] = true;
            }
            return { userAddedHidden: hidden };
          }
          // API holiday
          const removed = { ...state.userRemoved };
          if (removed[date]) {
            delete removed[date];
          } else {
            removed[date] = true;
          }
          return { userRemoved: removed };
        }),
      resetUserOverrides: () => set({ userAdded: {}, userRemoved: {}, userAddedHidden: {} }),
    }),
    {
      name: 'holidays-cache-v1',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (state) => ({
        byYear: state.byYear,
        userAdded: state.userAdded,
        userRemoved: state.userRemoved,
        userAddedHidden: state.userAddedHidden,
      }),
      // Migrate old format: userAdded was Record<string, string>, now Record<string, string[]>
      migrate: (persisted: unknown, _version: number) => {
        const state = persisted as Record<string, unknown>;
        if (state.userAdded && typeof state.userAdded === 'object') {
          const old = state.userAdded as Record<string, unknown>;
          const migrated: Record<string, string[]> = {};
          for (const [date, val] of Object.entries(old)) {
            if (typeof val === 'string') {
              migrated[date] = [val];
            } else if (Array.isArray(val)) {
              migrated[date] = val as string[];
            }
          }
          state.userAdded = migrated;
        }
        if (!state.userAddedHidden) {
          state.userAddedHidden = {};
        }
        return state as unknown as HolidaysState;
      },
      version: 1,
    },
  ),
);
