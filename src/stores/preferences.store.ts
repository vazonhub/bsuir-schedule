import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncStorageAdapter } from '@services/cache/asyncStorage';

/**
 * `0` — общая (без подгруппы или «все»), `1` / `2` — конкретная подгруппа.
 * Совпадает с семантикой `LessonDto.numSubgroup`.
 */
export type SubgroupChoice = 0 | 1 | 2;

interface PreferencesState {
  pinnedGroups: string[];
  pinnedEmployees: string[];
  /** Выбор подгруппы для конкретного расписания (по ключу — group name / employee urlId). */
  subgroupByKey: Record<string, SubgroupChoice>;

  togglePinnedGroup(name: string): void;
  togglePinnedEmployee(urlId: string): void;
  setSubgroup(key: string, value: SubgroupChoice): void;
}

const toggleInArray = (arr: string[], value: string): string[] =>
  arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      pinnedGroups: [],
      pinnedEmployees: [],
      subgroupByKey: {},

      togglePinnedGroup: (name) =>
        set((s) => ({ pinnedGroups: toggleInArray(s.pinnedGroups, name) })),

      togglePinnedEmployee: (urlId) =>
        set((s) => ({ pinnedEmployees: toggleInArray(s.pinnedEmployees, urlId) })),

      setSubgroup: (key, value) =>
        set((s) => ({ subgroupByKey: { ...s.subgroupByKey, [key]: value } })),
    }),
    {
      name: 'preferences-v1',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (state) => ({
        pinnedGroups: state.pinnedGroups,
        pinnedEmployees: state.pinnedEmployees,
        subgroupByKey: state.subgroupByKey,
      }),
    },
  ),
);

/** Selector helper: is `name` pinned in `pinnedGroups`? */
export const selectIsGroupPinned = (name: string) => (s: PreferencesState) =>
  s.pinnedGroups.includes(name);

/** Selector helper: is `urlId` pinned in `pinnedEmployees`? */
export const selectIsEmployeePinned = (urlId: string) => (s: PreferencesState) =>
  s.pinnedEmployees.includes(urlId);

/** Selector helper: subgroup chosen for `key` (default `0` = all). */
export const selectSubgroup = (key: string) => (s: PreferencesState): SubgroupChoice =>
  s.subgroupByKey[key] ?? 0;
