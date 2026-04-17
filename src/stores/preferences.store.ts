import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncStorageAdapter } from '@services/cache/asyncStorage';

/**
 * `0` — общая (без подгруппы или «все»), `1` / `2` — конкретная подгруппа.
 * Совпадает с семантикой `LessonDto.numSubgroup`.
 */
export type SubgroupChoice = 0 | 1 | 2;
export type ThemeChoice = 'auto' | 'light' | 'dark';
export type LanguageChoice = 'ru' | 'be' | 'en';

export interface DefaultEmployee {
  urlId: string;
  fio: string;
}

interface PreferencesState {
  pinnedGroups: string[];
  pinnedEmployees: string[];
  /** Группа, закреплённая на вкладке «Моё расписание» и на виджетах. */
  defaultGroup: string | null;
  /** Преподаватель, закреплённый на вкладке «Моё расписание». Взаимоисключающе с `defaultGroup`. */
  defaultEmployee: DefaultEmployee | null;
  /** Выбор подгруппы для конкретного расписания (по ключу — group name / employee urlId). */
  subgroupByKey: Record<string, SubgroupChoice>;
  theme: ThemeChoice;
  language: LanguageChoice;

  togglePinnedGroup(name: string): void;
  togglePinnedEmployee(urlId: string): void;
  setDefaultGroup(name: string | null): void;
  setDefaultEmployee(employee: DefaultEmployee | null): void;
  setSubgroup(key: string, value: SubgroupChoice): void;
  setTheme(theme: ThemeChoice): void;
  setLanguage(language: LanguageChoice): void;
}

const toggleInArray = (arr: string[], value: string): string[] =>
  arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      pinnedGroups: [],
      pinnedEmployees: [],
      defaultGroup: null,
      defaultEmployee: null,
      subgroupByKey: {},
      theme: 'auto' as ThemeChoice,
      language: 'ru' as LanguageChoice,

      togglePinnedGroup: (name) =>
        set((s) => ({ pinnedGroups: toggleInArray(s.pinnedGroups, name) })),

      togglePinnedEmployee: (urlId) =>
        set((s) => ({ pinnedEmployees: toggleInArray(s.pinnedEmployees, urlId) })),

      setDefaultGroup: (name) => set({ defaultGroup: name, defaultEmployee: null }),

      setDefaultEmployee: (employee) => set({ defaultEmployee: employee, defaultGroup: null }),

      setSubgroup: (key, value) =>
        set((s) => ({ subgroupByKey: { ...s.subgroupByKey, [key]: value } })),

      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'preferences-v1',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (state) => ({
        pinnedGroups: state.pinnedGroups,
        pinnedEmployees: state.pinnedEmployees,
        defaultGroup: state.defaultGroup,
        defaultEmployee: state.defaultEmployee,
        subgroupByKey: state.subgroupByKey,
        theme: state.theme,
        language: state.language,
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
