import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncStorageAdapter } from '@services/cache/asyncStorage';
import type { CurrentWeekNumber, ScheduleDto } from '@models/dto';

export type ErrorKind = 'server' | 'network' | 'generic';

interface ScheduleState {
  /** Cached schedules keyed by their identifier (group name or employee urlId). */
  byKey: Record<string, ScheduleDto | undefined>;
  loadingKey: string | null;
  error: string | null;
  errorKind: ErrorKind | null;
  currentWeek: CurrentWeekNumber | null;
  setSchedule(key: string, schedule: ScheduleDto): void;
  setLoadingKey(key: string | null): void;
  setError(message: string | null, kind?: ErrorKind): void;
  setCurrentWeek(week: CurrentWeekNumber | null): void;
}

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set) => ({
      byKey: {},
      loadingKey: null,
      error: null,
      errorKind: null,
      currentWeek: null,
      setSchedule: (key, schedule) =>
        set((s) => ({ byKey: { ...s.byKey, [key]: schedule } })),
      setLoadingKey: (loadingKey) => set({ loadingKey }),
      setError: (error, kind) => set({ error, errorKind: error ? (kind ?? 'generic') : null }),
      setCurrentWeek: (currentWeek) => set({ currentWeek }),
    }),
    {
      name: 'schedule-cache-v1',
      storage: createJSONStorage(() => asyncStorageAdapter),
      // Сохраняем только данные, не транзиентное состояние загрузки/ошибки.
      // При повторном входе пользователь сразу видит последнее закешированное
      // расписание, а контроллер тем временем обновляет его в фоне.
      partialize: (state) => ({
        byKey: state.byKey,
        currentWeek: state.currentWeek,
      }),
    },
  ),
);
