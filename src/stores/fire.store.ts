import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncStorageAdapter } from '@services/cache/asyncStorage';
import {
  WEEKLY_FREEZES,
  emptyFireCore,
  evaluateCore,
  markActivityCore,
  mergeFireCores,
  mondayOfISO,
  toLocalISO,
} from '@utils/fire';
import type { FireCore } from '@utils/fire';

/** Kind of celebration animation requested (Phase 4). */
export interface PendingCelebration {
  kind: 'record' | 'milestone';
  value: number;
}

interface FireStore extends FireCore {
  /** One-time migration of the per-group streak from `diary-v1`. */
  migratedFromDiary: boolean;
  /** Celebration request — consumed by the view and reset. */
  pendingCelebration: PendingCelebration | null;

  /** Merge the cloud core into the local one (cross-device sync). */
  mergeRemote(remote: FireCore): void;
  /** Catch up on the past (penalties for missed days). Called by the controller. */
  evaluate(now: Date, isLessonDay: (iso: string) => boolean): void;
  /** Register today's activity. Called by the controller. */
  markActivity(now: Date, isLessonDay: (iso: string) => boolean): void;
  /** Reset the celebration request after it has played. */
  consumeCelebration(): void;

  /** internal: one-time transfer of the old streak. */
  _migrate(): Promise<void>;
}

/** Key under which `diary.store` persists its state. */
const DIARY_PERSIST_KEY = 'diary-v1';

/** Extract the `FireCore` fields from the full store state. */
const pickCore = (s: FireStore): FireCore => ({
  current: s.current,
  longest: s.longest,
  lastActiveDate: s.lastActiveDate,
  lastEvalDate: s.lastEvalDate,
  freezes: s.freezes,
  freezeWeekStart: s.freezeWeekStart,
  history: s.history,
});

/** Legacy shape of a single streak entry in `diary-v1`. */
interface LegacyStreak {
  current?: number;
  longest?: number;
  lastActiveDate?: string | null;
}

export const useFireStore = create<FireStore>()(
  persist(
    (set, get) => ({
      ...emptyFireCore(),
      migratedFromDiary: false,
      pendingCelebration: null,

      mergeRemote: (remote) => {
        set(mergeFireCores(pickCore(get()), remote));
      },

      evaluate: (now, isLessonDay) => {
        const next = evaluateCore(pickCore(get()), toLocalISO(now), isLessonDay);
        set(next);
      },

      markActivity: (now, isLessonDay) => {
        const { core, event } = markActivityCore(pickCore(get()), toLocalISO(now), isLessonDay);
        const patch: Partial<FireStore> = { ...core };
        if (event.recordBeaten) {
          patch.pendingCelebration = { kind: 'record', value: core.current };
        } else if (event.milestone != null) {
          patch.pendingCelebration = { kind: 'milestone', value: event.milestone };
        }
        set(patch);
      },

      consumeCelebration: () => set({ pendingCelebration: null }),

      _migrate: async () => {
        if (get().migratedFromDiary) return;
        try {
          const raw = await AsyncStorage.getItem(DIARY_PERSIST_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as { state?: { streak?: Record<string, LegacyStreak> } };
            const streak = parsed.state?.streak ?? {};
            let maxCurrent = 0;
            let maxLongest = 0;
            let latest: string | null = null;
            for (const key of Object.keys(streak)) {
              const s = streak[key];
              if (!s) continue;
              const cur = s.current ?? 0;
              maxCurrent = Math.max(maxCurrent, cur);
              maxLongest = Math.max(maxLongest, s.longest ?? 0, cur);
              if (s.lastActiveDate && (latest == null || s.lastActiveDate > latest)) {
                latest = s.lastActiveDate;
              }
            }
            if (maxCurrent > 0 || maxLongest > 0) {
              const today = toLocalISO(new Date());
              set({
                current: maxCurrent,
                longest: maxLongest,
                lastActiveDate: latest,
                // latest was already an active day — treat it as accounted for,
                // otherwise the first evaluate would penalize it as a miss.
                lastEvalDate: latest,
                freezes: WEEKLY_FREEZES,
                freezeWeekStart: mondayOfISO(today),
              });
            }
          }
          // Mark the migration done only after a successful read (including
          // when there is no old data). On an exception the flag stays false —
          // otherwise a transient storage failure would lose the old streak
          // forever; we retry on the next launch.
          set({ migratedFromDiary: true });
        } catch {
          // best-effort: migration must not break app startup; retry later
        }
      },
    }),
    {
      name: 'fire-v1',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (state) => ({
        current: state.current,
        longest: state.longest,
        lastActiveDate: state.lastActiveDate,
        lastEvalDate: state.lastEvalDate,
        freezes: state.freezes,
        freezeWeekStart: state.freezeWeekStart,
        history: state.history,
        migratedFromDiary: state.migratedFromDiary,
      }),
      onRehydrateStorage: () => (state) => {
        void state?._migrate();
      },
    },
  ),
);

/** Selector: current streak. */
export const selectFireCurrent = (s: FireStore): number => s.current;

/** Selector: full core (for the sheet/badge). */
export const selectFireCore = (s: FireStore): FireCore => pickCore(s);
