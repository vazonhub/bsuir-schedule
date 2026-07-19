import { pullDiaryFromCloud, pushDiaryToCloud } from '@services/cloud/syncService';
import { useDiaryStore } from '@stores/diary.store';
import { usePreferencesStore, waitForHydration } from '@stores/preferences.store';
import { SNAPSHOT_VERSION } from '@utils/diarySync';
import type { DiaryCloudSnapshot } from '@utils/diarySync';

import { FireController } from './fire.controller';

/**
 * Оркестрация облачной синхронизации дневника (iCloud / Google Drive).
 *
 * Merge — LWW по `updatedAt`: весь снапшот (progress/hidden/planner +
 * blockedLessons + diaryOnboardingSeen) единое целое, более свежая запись
 * побеждает целиком. Метка штампуется в самом diary-сторе (Lamport-бамп);
 * push — best-effort с debounce после любого локального изменения;
 * pull — на старте, при возврате в foreground и при включении облачного
 * источника в настройках (подписка на preferences).
 *
 * View-слой контроллер не дёргает: экраны продолжают мутировать сторы
 * напрямую, контроллер ловит изменения подписками.
 */

const PUSH_DEBOUNCE_MS = 1_000;

/** Мемоизированный промис init — все входы ждут его (гидрация сторов). */
let initPromise: Promise<void> | null = null;
/** Глушит push-подписки, пока применяется удалённый снапшот (защита от петли). */
let applyingRemote = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

/** Собрать локальный снапшот из diary-стора и preferences. */
const buildLocalSnapshot = (): DiaryCloudSnapshot => {
  const diary = useDiaryStore.getState();
  const prefs = usePreferencesStore.getState();
  return {
    v: SNAPSHOT_VERSION,
    updatedAt: diary.updatedAt,
    progress: diary.progress,
    hidden: diary.hidden,
    planner: diary.planner,
    blockedLessons: prefs.blockedLessons,
    diaryOnboardingSeen: prefs.diaryOnboardingSeen,
  };
};

/**
 * Есть ли в снапшоте непустые пользовательские данные. Остаточные пустые
 * ключи (после un-hide / удаления всех элементов) данными не считаются.
 */
const hasLocalData = (s: DiaryCloudSnapshot): boolean =>
  Object.values(s.progress).some((group) => Object.keys(group).length > 0) ||
  Object.values(s.hidden).some((list) => list.length > 0) ||
  Object.values(s.planner).some((items) => items.length > 0) ||
  Object.values(s.blockedLessons).some((ids) => ids.length > 0) ||
  s.diaryOnboardingSeen;

/** Отложенный best-effort push (склеивает серии быстрых правок в одну запись). */
const schedulePush = (): void => {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushDiaryToCloud(buildLocalSnapshot());
  }, PUSH_DEBOUNCE_MS);
};

/** Применить более свежий облачный снапшот поверх локального состояния. */
const applyRemote = (remote: DiaryCloudSnapshot): void => {
  applyingRemote = true;
  try {
    useDiaryStore.getState().applyRemoteSnapshot({
      progress: remote.progress,
      hidden: remote.hidden,
      planner: remote.planner,
      updatedAt: remote.updatedAt,
    });
    const prefs = usePreferencesStore.getState();
    prefs.setBlockedLessons(remote.blockedLessons);
    // «Туториал показан» — только вверх (OR-merge): удалённый false не
    // сбрасывает локальный true, иначе replay туториала на одном устройстве
    // самопроизвольно запускал бы его на остальных.
    if (remote.diaryOnboardingSeen) prefs.setDiaryOnboardingSeen(true);
  } finally {
    applyingRemote = false;
  }
};

/**
 * Pull + LWW-merge + push. Best-effort: офлайн не мешает локальной работе.
 * Метка легаси-данных (updatedAt = 0, накоплены до появления синка)
 * штампуется только когда облако ПУСТО — если там уже есть снапшот,
 * он считается новее безметочных данных и принимается (LWW).
 */
const sync = async (): Promise<void> => {
  try {
    const res = await pullDiaryFromCloud();
    // Битый или другой версии блоб: не принимаем и не затираем push'ем —
    // с ним разберётся та версия приложения, которая его понимает.
    if (res.status === 'invalid') return;

    if (res.status === 'empty') {
      const diary = useDiaryStore.getState();
      if (diary.updatedAt === 0 && hasLocalData(buildLocalSnapshot())) {
        diary.touchUpdatedAt(Date.now());
      }
      const local = buildLocalSnapshot();
      if (local.updatedAt > 0) void pushDiaryToCloud(local);
      return;
    }

    const remote = res.data;
    const local = buildLocalSnapshot();
    if (remote.updatedAt > local.updatedAt) {
      applyRemote(remote);
    } else if (local.updatedAt > remote.updatedAt) {
      void pushDiaryToCloud(local);
    }
    // Равные метки — состояния уже согласованы.
  } catch {
    // Синк best-effort — молча пропускаем.
  }
};

/** Дождаться регидрации diary-стора из AsyncStorage. */
const waitForDiaryHydration = (): Promise<void> => {
  if (useDiaryStore.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = useDiaryStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
};

/**
 * Подписки на локальные изменения. Diary-стор сам штампует `updatedAt`
 * на каждой мутации данных, поэтому diary-подписка следит только за меткой.
 */
const subscribeStores = (): void => {
  useDiaryStore.subscribe((state, prev) => {
    if (applyingRemote) return;
    if (state.updatedAt === prev.updatedAt) return;
    schedulePush();
  });

  usePreferencesStore.subscribe((state, prev) => {
    if (applyingRemote) return;
    // Кросс-сторные синкаемые поля: штампуем метку дневника — push уедет
    // по diary-подписке выше.
    if (
      state.blockedLessons !== prev.blockedLessons ||
      state.diaryOnboardingSeen !== prev.diaryOnboardingSeen
    ) {
      useDiaryStore.getState().touchUpdatedAt(Date.now());
    }
    // Облачный источник только что включили (из настроек или любого будущего
    // кода) — сразу подтянуть дневник и огонёк, не дожидаясь foreground.
    const icloudEnabled = state.sourceICloud && !prev.sourceICloud;
    const driveEnabled = state.sourceGoogleDrive && !prev.sourceGoogleDrive;
    if (icloudEnabled || driveEnabled) {
      void sync();
      void FireController.onAppActive();
    }
  });
};

const doInit = async (): Promise<void> => {
  // Дождаться регидрации ОБОИХ сторов до подписок и первого sync — иначе
  // регидрация выглядела бы как «правка», а sync работал бы с пустым стором.
  await Promise.all([waitForDiaryHydration(), waitForHydration()]);
  subscribeStores();
  await sync();
};

export const DiaryController = {
  /**
   * Инициализация на старте приложения. Идемпотентна: повторные вызовы
   * (и любые входы ниже) ждут один и тот же промис.
   */
  init: (): Promise<void> => (initPromise ??= doInit()),

  /** Возврат в foreground — подтянуть возможные правки с другого устройства. */
  async onAppActive(): Promise<void> {
    const alreadyStarted = initPromise != null;
    await DiaryController.init();
    // init уже был запущен ранее — его sync мог отработать давно, нужен свежий.
    if (alreadyStarted) await sync();
  },
};
