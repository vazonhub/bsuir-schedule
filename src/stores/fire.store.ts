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

/** Тип запрошенной празднич­ной анимации (Фаза 4). */
export interface PendingCelebration {
  kind: 'record' | 'milestone';
  value: number;
}

interface FireStore extends FireCore {
  /** Одноразовая миграция per-group streak из `diary-v1`. */
  migratedFromDiary: boolean;
  /** Запрос на celebration — потребляется вью и сбрасывается. */
  pendingCelebration: PendingCelebration | null;

  /** Слить облачное ядро в локальное (синк между устройствами). */
  mergeRemote(remote: FireCore): void;
  /** Догнать прошлое (штрафы за пропуски). Вызывается контроллером. */
  evaluate(now: Date, isLessonDay: (iso: string) => boolean): void;
  /** Начислить активность за сегодня. Вызывается контроллером. */
  markActivity(now: Date, isLessonDay: (iso: string) => boolean): void;
  /** Сбросить запрос на celebration после проигрывания. */
  consumeCelebration(): void;

  /** internal: одноразовый перенос старого streak. */
  _migrate(): Promise<void>;
}

/** Ключ, под которым `diary.store` персистит своё состояние. */
const DIARY_PERSIST_KEY = 'diary-v1';

/** Вытащить `FireCore`-поля из полного состояния стора. */
const pickCore = (s: FireStore): FireCore => ({
  current: s.current,
  longest: s.longest,
  lastActiveDate: s.lastActiveDate,
  lastEvalDate: s.lastEvalDate,
  freezes: s.freezes,
  freezeWeekStart: s.freezeWeekStart,
  history: s.history,
});

/** Legacy-форма одной записи streak в `diary-v1`. */
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
                // latest уже был активным днём — считаем его учтённым, иначе
                // первый evaluate оштрафует его как пропуск.
                lastEvalDate: latest,
                freezes: WEEKLY_FREEZES,
                freezeWeekStart: mondayOfISO(today),
              });
            }
          }
        } catch {
          // best-effort: миграция не должна ломать старт приложения
        }
        set({ migratedFromDiary: true });
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

/** Селектор: текущая серия. */
export const selectFireCurrent = (s: FireStore): number => s.current;

/** Селектор: полное ядро (для шита/бейджа). */
export const selectFireCore = (s: FireStore): FireCore => pickCore(s);
