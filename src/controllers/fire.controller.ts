import { pullFireFromCloud, pushFireToCloud } from '@services/cloud/syncService';
import { selectFireCore, useFireStore } from '@stores/fire.store';
import { usePreferencesStore } from '@stores/preferences.store';
import { useScheduleStore } from '@stores/schedule.store';
import { buildLessonDayChecker } from '@utils/fire';

/**
 * Оркестрация огонька — единственное место, где логика огонька пересекается
 * с расписанием. View дёргает эти методы, стор ничего не знает о расписании.
 *
 * «Учебные дни» берутся из расписания закреплённой группы (`defaultGroup`).
 * Если группа/расписание/номер недели ещё не загружены — предикат вернёт
 * `false` для всех дней, т.е. штрафов и начислений не будет (не наказываем
 * несправедливо). Поэтому `onAppActive` вызывается ПОСЛЕ `prefetchPinned`,
 * когда `currentWeek` и расписание уже в сторе.
 */
const buildChecker = (now: Date): ((iso: string) => boolean) => {
  const { defaultGroup } = usePreferencesStore.getState();
  if (!defaultGroup) return () => false;
  const scheduleStore = useScheduleStore.getState();
  const schedule = scheduleStore.byKey[defaultGroup];
  const currentWeek = scheduleStore.currentWeek;
  if (!schedule || currentWeek == null) return () => false;
  return buildLessonDayChecker(schedule, currentWeek, now);
};

/**
 * Догнать прошлое и, если сегодня учебный день, начислить активность.
 * `markActivity` идемпотентен в пределах дня, поэтому повторные вызовы из
 * разных точек (вход / расписание / домашка) безопасны — максимум +1 в день.
 * После изменения — best-effort push в облако.
 */
const register = (now: Date): void => {
  useFireStore.getState().markActivity(now, buildChecker(now));
  void pushFireToCloud(selectFireCore(useFireStore.getState()));
};

export const FireController = {
  /**
   * Старт приложения / возврат в foreground. Вызывать ПОСЛЕ prefetch.
   * Сначала подтягивает облачное ядро и сливает его в локальное (синк между
   * устройствами), затем догоняет прошлое и начисляет активность.
   */
  async onAppActive(now: Date = new Date()): Promise<void> {
    try {
      const remote = await pullFireFromCloud();
      if (remote) useFireStore.getState().mergeRemote(remote);
    } catch {
      // синк best-effort — офлайн не должен мешать локальному огоньку
    }
    register(now);
  },

  /** Пользователь посмотрел расписание. */
  registerScheduleView(now: Date = new Date()): void {
    register(now);
  },

  /** Пользователь отметил задачу в дневнике (любое взаимодействие с домашкой). */
  registerHomework(now: Date = new Date()): void {
    register(now);
  },
};
