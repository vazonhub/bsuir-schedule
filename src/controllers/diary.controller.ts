import { pullDiaryFromCloud, pushDiaryToCloud } from '@services/cloud/syncService';
import { useDiaryStore } from '@stores/diary.store';
import { usePreferencesStore, waitForHydration } from '@stores/preferences.store';
import { SNAPSHOT_VERSION } from '@utils/diarySync';
import type { DiaryCloudSnapshot } from '@utils/diarySync';

import { FireController } from './fire.controller';

/**
 * Orchestration of diary cloud sync (iCloud / Google Drive).
 *
 * Merge is LWW by `updatedAt`: the whole snapshot (progress/hidden/planner +
 * blockedLessons + diaryOnboardingSeen) is a single unit, the fresher record
 * wins entirely. The timestamp is stamped in the diary store itself (Lamport bump);
 * push — best-effort with a debounce after any local change;
 * pull — on startup, on returning to foreground, and when a cloud source
 * is enabled in settings (preferences subscription).
 *
 * The controller does not touch the view layer: screens keep mutating the stores
 * directly, the controller catches changes via subscriptions.
 */

const PUSH_DEBOUNCE_MS = 1_000;

/** Memoized init promise — all entry points await it (store hydration). */
let initPromise: Promise<void> | null = null;
/** Mutes push subscriptions while a remote snapshot is being applied (loop protection). */
let applyingRemote = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

/** Build the local snapshot from the diary store and preferences. */
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
 * Whether the snapshot contains non-empty user data. Leftover empty
 * keys (after un-hide / deleting all items) do not count as data.
 */
const hasLocalData = (s: DiaryCloudSnapshot): boolean =>
  Object.values(s.progress).some((group) => Object.keys(group).length > 0) ||
  Object.values(s.hidden).some((list) => list.length > 0) ||
  Object.values(s.planner).some((items) => items.length > 0) ||
  Object.values(s.blockedLessons).some((ids) => ids.length > 0) ||
  s.diaryOnboardingSeen;

/** Deferred best-effort push (coalesces bursts of quick edits into one write). */
const schedulePush = (): void => {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushDiaryToCloud(buildLocalSnapshot());
  }, PUSH_DEBOUNCE_MS);
};

/** Apply a fresher cloud snapshot on top of local state. */
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
    // "Tutorial seen" only moves upward (OR-merge): a remote false does not
    // reset a local true, otherwise replaying the tutorial on one device
    // would spontaneously relaunch it on the others.
    if (remote.diaryOnboardingSeen) prefs.setDiaryOnboardingSeen(true);
  } finally {
    applyingRemote = false;
  }
};

/**
 * Pull + LWW-merge + push. Best-effort: being offline does not block local work.
 * The timestamp for legacy data (updatedAt = 0, accumulated before sync existed)
 * is stamped only when the cloud is EMPTY — if a snapshot already exists there,
 * it is considered newer than the unstamped data and is accepted (LWW).
 */
const sync = async (): Promise<void> => {
  try {
    const res = await pullDiaryFromCloud();
    // Corrupted or different-version blob: neither accept it nor overwrite it with
    // a push — the app version that understands it will deal with it.
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
    // Equal timestamps — states are already in agreement.
  } catch {
    // Sync is best-effort — silently skip.
  }
};

/** Wait for the diary store to rehydrate from AsyncStorage. */
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
 * Subscriptions to local changes. The diary store stamps `updatedAt` itself
 * on every data mutation, so the diary subscription only watches the timestamp.
 */
const subscribeStores = (): void => {
  useDiaryStore.subscribe((state, prev) => {
    if (applyingRemote) return;
    if (state.updatedAt === prev.updatedAt) return;
    schedulePush();
  });

  usePreferencesStore.subscribe((state, prev) => {
    if (applyingRemote) return;
    // Cross-store synced fields: stamp the diary timestamp — the push will go out
    // via the diary subscription above.
    if (
      state.blockedLessons !== prev.blockedLessons ||
      state.diaryOnboardingSeen !== prev.diaryOnboardingSeen
    ) {
      useDiaryStore.getState().touchUpdatedAt(Date.now());
    }
    // A cloud source was just enabled (from settings or any future code) —
    // immediately pull the diary and the streak, without waiting for foreground.
    const icloudEnabled = state.sourceICloud && !prev.sourceICloud;
    const driveEnabled = state.sourceGoogleDrive && !prev.sourceGoogleDrive;
    if (icloudEnabled || driveEnabled) {
      void sync();
      void FireController.onAppActive();
    }
  });
};

const doInit = async (): Promise<void> => {
  // Wait for BOTH stores to rehydrate before subscribing and the first sync —
  // otherwise rehydration would look like an "edit" and sync would run on an empty store.
  await Promise.all([waitForDiaryHydration(), waitForHydration()]);
  subscribeStores();
  await sync();
};

export const DiaryController = {
  /**
   * Initialization on app startup. Idempotent: repeated calls
   * (and all entry points below) await the same promise.
   */
  init: (): Promise<void> => (initPromise ??= doInit()),

  /** Return to foreground — pull possible edits from another device. */
  async onAppActive(): Promise<void> {
    const alreadyStarted = initPromise != null;
    await DiaryController.init();
    // init was already started earlier — its sync may have run long ago, need a fresh one.
    if (alreadyStarted) await sync();
  },
};
