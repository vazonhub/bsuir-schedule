import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Appearance } from 'react-native';

import { getSystemLanguage } from '@i18n';
import { asyncStorageAdapter } from '@services/cache/asyncStorage';
import { getSystemScheme } from '@utils/systemScheme';
import type { KnownLessonType } from '@theme/colors';

export type LessonColorOverrides = Partial<Record<KnownLessonType, string>>;

export interface IconOverrides {
  exam?: string;
  today?: string;
  subgroup?: string;
  favorites?: string;
  location?: string;
  clock?: string;
  block?: string;
}

/** Per-icon-slot color overrides. Only exam and today have customizable colors. */
export type IconColorOverrides = Partial<Record<string, string>>;

/**
 * `0` — shared (no subgroup or "all"), `1` / `2` — a specific subgroup.
 * Matches the semantics of `LessonDto.numSubgroup`.
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
  /** Group pinned on the "My schedule" tab and on widgets. */
  defaultGroup: string | null;
  /** Teacher pinned on the "My schedule" tab. Mutually exclusive with `defaultGroup`. */
  defaultEmployee: DefaultEmployee | null;
  /** Subgroup choice for a specific schedule (keyed by group name / employee urlId). */
  subgroupByKey: Record<string, SubgroupChoice>;
  theme: ThemeChoice;
  /** Actual resolved scheme — avoids depending on the async useColorScheme(). */
  resolvedScheme: ResolvedScheme;
  language: LanguageChoice;
  /** When true, days before today are hidden from the schedule list. */
  hidePastLessons: boolean;
  /** Data source toggles — which backends to use for schedule data. */
  sourceBsuirApi: boolean;
  sourceICloud: boolean;
  sourceGoogleDrive: boolean;

  /** Android in-app override: differentiate without color (iOS uses system setting). */
  androidDifferentiateWithoutColor: boolean;
  /** Android in-app override: high contrast palette (iOS uses system setting). */
  androidHighContrast: boolean;

  togglePinnedGroup(name: string): void;
  togglePinnedEmployee(urlId: string): void;
  setDefaultGroup(name: string | null): void;
  setDefaultEmployee(employee: DefaultEmployee | null): void;
  setSubgroup(key: string, value: SubgroupChoice): void;
  setTheme(theme: ThemeChoice): void;
  setLanguage(language: LanguageChoice): void;
  setHidePastLessons(value: boolean): void;
  setSourceBsuirApi(value: boolean): void;
  setSourceICloud(value: boolean): void;
  setSourceGoogleDrive(value: boolean): void;
  setAndroidDifferentiateWithoutColor(value: boolean): void;
  setAndroidHighContrast(value: boolean): void;
  /** Last version whose release notes the user has already seen. */
  lastSeenVersion: string | null;
  setLastSeenVersion(version: string): void;
  /** Whether the step-by-step tutorial on the "Diary" tab has been seen. */
  diaryOnboardingSeen: boolean;
  setDiaryOnboardingSeen(value: boolean): void;
  /** Blocked lessons: entityKey → array of block IDs. */
  blockedLessons: Record<string, string[]>;
  toggleBlockedLesson(entityKey: string, blockId: string): void;
  /** Full replacement of the blocked-lessons map (applying a diary cloud snapshot). */
  setBlockedLessons(map: Record<string, string[]>): void;

  /** Appearance customization */
  lessonColorOverrides: LessonColorOverrides;
  iconOverrides: IconOverrides;
  iconColorOverrides: IconColorOverrides;
  setLessonColor(type: KnownLessonType, color: string): void;
  resetLessonColor(type: KnownLessonType): void;
  setIcon(slot: keyof IconOverrides, iconName: string): void;
  resetIcon(slot: keyof IconOverrides): void;
  setIconColor(slot: string, color: string): void;
  resetIconColor(slot: string): void;
  resetAllAppearance(): void;
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
      language: getSystemLanguage(),
      hidePastLessons: true,
      sourceBsuirApi: true,
      sourceICloud: true,
      sourceGoogleDrive: false,
      androidDifferentiateWithoutColor: false,
      androidHighContrast: false,
      lastSeenVersion: null,
      diaryOnboardingSeen: false,
      blockedLessons: {},
      lessonColorOverrides: {},
      iconOverrides: {},
      iconColorOverrides: {},

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
          const resolved = (Appearance.getColorScheme() as ResolvedScheme | null) ?? 'light';
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
      setHidePastLessons: (value) => set({ hidePastLessons: value }),
      setSourceBsuirApi: (value) => {
        // At least one source must be enabled.
        const { sourceICloud, sourceGoogleDrive } = get();
        if (!value && !sourceICloud && !sourceGoogleDrive) return;
        set({ sourceBsuirApi: value });
      },
      setSourceICloud: (value) => {
        const { sourceBsuirApi, sourceGoogleDrive } = get();
        if (!value && !sourceBsuirApi && !sourceGoogleDrive) return;
        set({ sourceICloud: value });
      },
      setSourceGoogleDrive: (value) => {
        const { sourceBsuirApi, sourceICloud } = get();
        if (!value && !sourceBsuirApi && !sourceICloud) return;
        set({ sourceGoogleDrive: value });
      },
      setAndroidDifferentiateWithoutColor: (value) =>
        set({ androidDifferentiateWithoutColor: value }),
      setAndroidHighContrast: (value) => set({ androidHighContrast: value }),
      setLastSeenVersion: (version) => set({ lastSeenVersion: version }),
      setDiaryOnboardingSeen: (value) => set({ diaryOnboardingSeen: value }),
      toggleBlockedLesson: (entityKey, blockId) =>
        set((s) => {
          const current = s.blockedLessons[entityKey] ?? [];
          const next = current.includes(blockId)
            ? current.filter((id) => id !== blockId)
            : [...current, blockId];
          return { blockedLessons: { ...s.blockedLessons, [entityKey]: next } };
        }),
      setBlockedLessons: (map) => set({ blockedLessons: map }),

      setLessonColor: (type, color) =>
        set((s) => ({ lessonColorOverrides: { ...s.lessonColorOverrides, [type]: color } })),
      resetLessonColor: (type) =>
        set((s) => {
          const next = { ...s.lessonColorOverrides };
          delete next[type];
          return { lessonColorOverrides: next };
        }),
      setIcon: (slot, iconName) =>
        set((s) => ({ iconOverrides: { ...s.iconOverrides, [slot]: iconName } })),
      resetIcon: (slot) =>
        set((s) => {
          const next = { ...s.iconOverrides };
          delete next[slot];
          return { iconOverrides: next };
        }),
      setIconColor: (slot, color) =>
        set((s) => ({ iconColorOverrides: { ...s.iconColorOverrides, [slot]: color } })),
      resetIconColor: (slot) =>
        set((s) => {
          const next = { ...s.iconColorOverrides };
          delete next[slot];
          return { iconColorOverrides: next };
        }),
      resetAllAppearance: () =>
        set({ lessonColorOverrides: {}, iconOverrides: {}, iconColorOverrides: {} }),
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
        hidePastLessons: state.hidePastLessons,
        sourceBsuirApi: state.sourceBsuirApi,
        sourceICloud: state.sourceICloud,
        sourceGoogleDrive: state.sourceGoogleDrive,
        androidDifferentiateWithoutColor: state.androidDifferentiateWithoutColor,
        androidHighContrast: state.androidHighContrast,
        lastSeenVersion: state.lastSeenVersion,
        diaryOnboardingSeen: state.diaryOnboardingSeen,
        blockedLessons: state.blockedLessons,
        lessonColorOverrides: state.lessonColorOverrides,
        iconOverrides: state.iconOverrides,
        iconColorOverrides: state.iconColorOverrides,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.theme === 'auto') {
            // Remove any stale override so the system scheme is visible.
            Appearance.setColorScheme(null);
            const resolved = (Appearance.getColorScheme() as ResolvedScheme | null) ?? 'light';
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

/**
 * Returns a promise that resolves once preferences have been rehydrated
 * from AsyncStorage. Safe to call multiple times — resolves immediately
 * if hydration has already completed.
 */
export const waitForHydration = (): Promise<void> => {
  if (usePreferencesStore.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = usePreferencesStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
};

/** Selector helper: has the diary tutorial already been shown? */
export const selectDiaryOnboardingSeen = (s: PreferencesState): boolean => s.diaryOnboardingSeen;

/** Selector helper: is `name` pinned in `pinnedGroups`? */
export const selectIsGroupPinned = (name: string) => (s: PreferencesState) =>
  s.pinnedGroups.includes(name);

/** Selector helper: is `urlId` pinned in `pinnedEmployees`? */
export const selectIsEmployeePinned = (urlId: string) => (s: PreferencesState) =>
  s.pinnedEmployees.includes(urlId);

/** Selector helper: subgroup chosen for `key` (default `0` = all). */
export const selectSubgroup =
  (key: string) =>
  (s: PreferencesState): SubgroupChoice =>
    s.subgroupByKey[key] ?? 0;

const EMPTY_BLOCKED: string[] = [];

/** Selector helper: blocked lesson IDs for `entityKey`. */
export const selectBlockedLessons =
  (entityKey: string) =>
  (s: PreferencesState): string[] =>
    s.blockedLessons[entityKey] ?? EMPTY_BLOCKED;
