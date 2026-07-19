import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncStorageAdapter } from '@services/cache/asyncStorage';
import type { CurrentWeekNumber, ScheduleDto } from '@models/dto';

export type ErrorKind = 'server' | 'network' | 'generic' | 'apiDisabled';

interface ScheduleState {
  /** Cached schedules keyed by their identifier (group name or employee urlId). */
  byKey: Record<string, ScheduleDto | undefined>;
  /** Keys of schedules currently being loaded (supports parallel loads). */
  loadingKeys: Record<string, true | undefined>;
  error: string | null;
  errorKind: ErrorKind | null;
  currentWeek: CurrentWeekNumber | null;
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
      setSchedule: (key, schedule) => set((s) => ({ byKey: { ...s.byKey, [key]: schedule } })),
      addLoadingKey: (key) => set((s) => ({ loadingKeys: { ...s.loadingKeys, [key]: true } })),
      removeLoadingKey: (key) =>
        set((s) => {
          const { [key]: _, ...rest } = s.loadingKeys;
          return { loadingKeys: rest };
        }),
      setError: (error, kind) => set({ error, errorKind: error ? (kind ?? 'generic') : null }),
      setCurrentWeek: (currentWeek) => set({ currentWeek }),
    }),
    {
      name: 'schedule-cache-v1',
      storage: createJSONStorage(() => asyncStorageAdapter),
      // Persist only the data, not the transient loading/error state.
      // On the next launch the user immediately sees the last cached
      // schedule, while the controller refreshes it in the background.
      partialize: (state) => ({
        byKey: state.byKey,
        // currentWeek intentionally NOT persisted — always fetched fresh
        // from the API on startup to avoid stale week after days offline.
      }),
    },
  ),
);
