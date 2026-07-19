import { pullDiaryFromCloud, pushDiaryToCloud } from '@services/cloud/syncService';
import { useDiaryStore } from '@stores/diary.store';
import { usePreferencesStore, waitForHydration } from '@stores/preferences.store';
import type { DiaryCloudSnapshot } from '@utils/diarySync';

/**
 * Оркестрация облачной синхронизации дневника (iCloud / Google Drive).
 *
 * Merge — LWW по `updatedAt`: весь снапшот (progress/hidden/planner +
 * blockedLessons + diaryOnboardingSeen) единое целое, более свежая запись
 * побеждает целиком. Push — best-effort с debounce после любого локального
 * изменения; pull — на старте и при возврате в foreground.
 *
 * View-слой контроллер не дёргает: экраны продолжают мутировать сторы
 * напрямую, контроллер ловит изменения подписками.
 */

const PUSH_DEBOUNCE_MS = 1_000;

let initialized = false;
/** Глушит push-подписки, пока применяется удалённый снапшот (защита от петли). */
let applyingRemote = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

/** Собрать локальный снапшот из diary-стора и preferences. */
const buildLocalSnapshot = (): DiaryCloudSnapshot => {
  const diary = useDiaryStore.getState();
  const prefs = usePreferencesStore.getState();
  return {
    updatedAt: diary.updatedAt,
    progress: diary.progress,
    hidden: diary.hidden,
    planner: diary.planner,
    blockedLessons: prefs.blockedLessons,
    diaryOnboardingSeen: prefs.diaryOnboardingSeen,
  };
};

/** Есть ли в снапшоте хоть какие-то пользовательские данные. */
const hasLocalData = (s: DiaryCloudSnapshot): boolean =>
  Object.keys(s.progress).length > 0 ||
  Object.keys(s.hidden).length > 0 ||
  Object.keys(s.planner).length > 0 ||
  Object.keys(s.blockedLessons).length > 0 ||
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
    prefs.setDiaryOnboardingSeen(remote.diaryOnboardingSeen);
  } finally {
    applyingRemote = false;
  }
};

/** Pull + LWW-merge + push. Best-effort: офлайн не мешает локальной работе. */
const sync = async (now: number = Date.now()): Promise<void> => {
  try {
    // Данные, накопленные до появления синка, не имеют метки (updatedAt = 0) —
    // стемпим, чтобы они не проигрывали LWW любому облачному снапшоту.
    const diary = useDiaryStore.getState();
    if (diary.updatedAt === 0 && hasLocalData(buildLocalSnapshot())) {
      diary.touchUpdatedAt(now);
    }

    const remote = await pullDiaryFromCloud();
    const local = buildLocalSnapshot();

    if (!remote) {
      if (local.updatedAt > 0) void pushDiaryToCloud(local);
      return;
    }
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
 * Подписки на локальные изменения. Сравниваем только синкаемые срезы —
 * `touchUpdatedAt` внутри подписчика меняет лишь `updatedAt` и повторного
 * срабатывания не вызывает.
 */
const subscribeStores = (): void => {
  useDiaryStore.subscribe((state, prev) => {
    if (applyingRemote) return;
    if (
      state.progress === prev.progress &&
      state.hidden === prev.hidden &&
      state.planner === prev.planner
    ) {
      return;
    }
    state.touchUpdatedAt(Date.now());
    schedulePush();
  });

  usePreferencesStore.subscribe((state, prev) => {
    if (applyingRemote) return;
    if (
      state.blockedLessons === prev.blockedLessons &&
      state.diaryOnboardingSeen === prev.diaryOnboardingSeen
    ) {
      return;
    }
    useDiaryStore.getState().touchUpdatedAt(Date.now());
    schedulePush();
  });
};

export const DiaryController = {
  /**
   * Одноразовая инициализация на старте приложения: дождаться регидрации
   * обоих сторов (иначе регидрация выглядела бы как «правка» и стемпила
   * updatedAt), подписаться на изменения и выполнить первый sync.
   */
  async init(): Promise<void> {
    if (initialized) return;
    initialized = true;
    await Promise.all([waitForDiaryHydration(), waitForHydration()]);
    subscribeStores();
    await sync();
  },

  /** Возврат в foreground — подтянуть возможные правки с другого устройства. */
  async onAppActive(): Promise<void> {
    if (!initialized) {
      await DiaryController.init();
      return;
    }
    await sync();
  },

  /** Пользователь включил облачный источник в настройках — синкнуться сразу. */
  onCloudSourceEnabled(): void {
    void sync();
  },
};
