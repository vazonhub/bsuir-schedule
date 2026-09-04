import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncStorageAdapter } from '@services/cache/asyncStorage';
import type { CurrentWeekNumber, ScheduleDto } from '@models/dto';
import { computeWeekForDate } from '@utils/scheduleNormalization';

export type ErrorKind = 'server' | 'network' | 'generic' | 'apiDisabled';

interface ScheduleState {
  /** Cached schedules keyed by their identifier (group name or employee urlId). */
  byKey: Record<string, ScheduleDto | undefined>;
  /** Keys of schedules currently being loaded (supports parallel loads). */
  loadingKeys: Record<string, true | undefined>;
  error: string | null;
  errorKind: ErrorKind | null;
  currentWeek: CurrentWeekNumber | null;
  /**
   * Wall-clock timestamp (ms) of when `currentWeek` was last set from the
   * network. Used to rotate the cached week across the 4-week Monday cycle so
   * an offline launch still shows the correct week instead of a stale one.
   */
  currentWeekSetAt: number | null;
  setSchedule(key: string, schedule: ScheduleDto): void;
  addLoadingKey(key: string): void;
  removeLoadingKey(key: string): void;
  setError(message: string | null, kind?: ErrorKind): void;
  setCurrentWeek(week: CurrentWeekNumber | null): void;
}

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set) => ({
      byKey: {},
      loadingKeys: {},
      error: null,
      errorKind: null,
      currentWeek: null,
      currentWeekSetAt: null,
      setSchedule: (key, schedule) => set((s) => ({ byKey: { ...s.byKey, [key]: schedule } })),
      addLoadingKey: (key) => set((s) => ({ loadingKeys: { ...s.loadingKeys, [key]: true } })),
      removeLoadingKey: (key) =>
        set((s) => {
          const { [key]: _, ...rest } = s.loadingKeys;
          return { loadingKeys: rest };
        }),
      setError: (error, kind) => set({ error, errorKind: error ? (kind ?? 'generic') : null }),
      setCurrentWeek: (currentWeek) =>
        set({ currentWeek, currentWeekSetAt: currentWeek == null ? null : Date.now() }),
    }),
    {
      name: 'schedule-cache-v1',
      storage: createJSONStorage(() => asyncStorageAdapter),
      // Persist the cached schedules AND the last known week (with its anchor
      // timestamp). On the next launch the user immediately sees the last
      // cached schedule while the controller refreshes it in the background.
      partialize: (state) => ({
        byKey: state.byKey,
        currentWeek: state.currentWeek,
        currentWeekSetAt: state.currentWeekSetAt,
      }),
      // On rehydration, rotate the persisted week across the 4-week cycle so
      // an offline launch shows the correct week (never a stale one) even when
      // the API is unreachable. A successful network fetch later overwrites it.
      onRehydrateStorage: () => (state) => {
        if (!state || state.currentWeek == null || state.currentWeekSetAt == null) return;
        const rotated = computeWeekForDate(
          new Date(),
          new Date(state.currentWeekSetAt),
          state.currentWeek,
        );
        state.currentWeek = rotated;
      },
    },
  ),
);
