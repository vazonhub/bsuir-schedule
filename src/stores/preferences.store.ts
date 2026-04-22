import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Appearance } from 'react-native';

import { asyncStorageAdapter } from '@services/cache/asyncStorage';
import { getSystemScheme } from '@utils/systemScheme';

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

/** Resolved scheme — the actual light/dark value after resolving 'auto'. */
export type ResolvedScheme = 'light' | 'dark';

const resolveScheme = (theme: ThemeChoice): ResolvedScheme => {
  if (theme === 'auto') return getSystemScheme();
  return theme;
};

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
  /** Actual resolved scheme — avoids depending on the async useColorScheme(). */
  resolvedScheme: ResolvedScheme;
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
    (set, get) => ({
      pinnedGroups: [],
      pinnedEmployees: [],
      defaultGroup: null,
      defaultEmployee: null,
      subgroupByKey: {},
      theme: 'auto' as ThemeChoice,
      resolvedScheme: resolveScheme('auto'),
      language: 'ru' as LanguageChoice,

      togglePinnedGroup: (name) =>
        set((s) => ({ pinnedGroups: toggleInArray(s.pinnedGroups, name) })),

      togglePinnedEmployee: (urlId) =>
        set((s) => ({ pinnedEmployees: toggleInArray(s.pinnedEmployees, urlId) })),

      setDefaultGroup: (name) => set({ defaultGroup: name, defaultEmployee: null }),

      setDefaultEmployee: (employee) => set({ defaultEmployee: employee, defaultGroup: null }),

      setSubgroup: (key, value) =>
        set((s) => ({ subgroupByKey: { ...s.subgroupByKey, [key]: value } })),

      setTheme: (theme) => {
        if (theme === 'auto') {
          // Remove the forced override so the system scheme becomes visible
          // again, then read the real value.
          Appearance.setColorScheme(null);
          const resolved =
            (Appearance.getColorScheme() as ResolvedScheme | null) ?? 'light';
          set({ theme, resolvedScheme: resolved });
        } else {
          set({ theme, resolvedScheme: theme });
          // Defer the native style flip so traitCollectionDidChange only
          // fires after the bridge has delivered the new JS props.
          setTimeout(() => {
            Appearance.setColorScheme(theme);
          }, 150);
        }
      },
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
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.theme === 'auto') {
            // Remove any stale override so the system scheme is visible.
            Appearance.setColorScheme(null);
            const resolved =
              (Appearance.getColorScheme() as ResolvedScheme | null) ?? 'light';
            if (state.resolvedScheme !== resolved) {
              usePreferencesStore.setState({ resolvedScheme: resolved });
            }
          } else {
            Appearance.setColorScheme(state.theme);
            if (state.resolvedScheme !== state.theme) {
              usePreferencesStore.setState({ resolvedScheme: state.theme });
            }
          }
        }
      },
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
