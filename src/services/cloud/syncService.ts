import type { ScheduleDto } from '@models/dto';
import { usePreferencesStore } from '@stores/preferences.store';
import type { DiaryCloudSnapshot } from '@utils/diarySync';
import { isDiaryCloudSnapshot } from '@utils/diarySync';
import type { FireCore } from '@utils/fire';
import { isFireCore } from '@utils/fire';

import {
  googleDriveGet,
  googleDriveGetAllKeys,
  googleDriveRemove,
  googleDriveSet,
  isGoogleDriveAvailable,
} from './googleDrive';
import { icloudGet, icloudGetAllKeys, icloudRemove, icloudSet, isICloudAvailable } from './icloud';

const SCHEDULE_PREFIX = 'schedule:';
/** Single key holding the global fire (streak) snapshot. */
const FIRE_KEY = 'fire:state';
/** Single key holding the diary snapshot (progress/hidden/planner + prefs). */
const DIARY_KEY = 'diary:state';

/** Push a schedule to cloud storage (best-effort, fire-and-forget). */
export const pushScheduleToCloud = async (key: string, data: ScheduleDto): Promise<void> => {
  const prefs = usePreferencesStore.getState();
  const json = JSON.stringify(data);

  if (isICloudAvailable && prefs.sourceICloud) {
    await icloudSet(SCHEDULE_PREFIX + key, json);
  }
  if (isGoogleDriveAvailable && prefs.sourceGoogleDrive) {
    await googleDriveSet(SCHEDULE_PREFIX + key, json);
  }
};

/**
 * Try to load a schedule from cloud storage.
 * Used as a fallback when the API is unreachable.
 */
export const pullScheduleFromCloud = async (key: string): Promise<ScheduleDto | null> => {
  const prefs = usePreferencesStore.getState();
  let raw: string | null = null;

  if (isICloudAvailable && prefs.sourceICloud) {
    raw = await icloudGet(SCHEDULE_PREFIX + key);
  }
  if (!raw && isGoogleDriveAvailable && prefs.sourceGoogleDrive) {
    raw = await googleDriveGet(SCHEDULE_PREFIX + key);
  }

  if (!raw) return null;
  try {
    return JSON.parse(raw) as ScheduleDto;
  } catch {
    return null;
  }
};

/** Push the global fire snapshot to cloud storage (best-effort). */
export const pushFireToCloud = async (core: FireCore): Promise<void> => {
  const prefs = usePreferencesStore.getState();
  const json = JSON.stringify(core);

  if (isICloudAvailable && prefs.sourceICloud) {
    await icloudSet(FIRE_KEY, json);
  }
  if (isGoogleDriveAvailable && prefs.sourceGoogleDrive) {
    await googleDriveSet(FIRE_KEY, json);
  }
};

/** Pull the global fire snapshot from cloud storage (validated). */
export const pullFireFromCloud = async (): Promise<FireCore | null> => {
  const prefs = usePreferencesStore.getState();
  let raw: string | null = null;

  if (isICloudAvailable && prefs.sourceICloud) {
    raw = await icloudGet(FIRE_KEY);
  }
  if (!raw && isGoogleDriveAvailable && prefs.sourceGoogleDrive) {
    raw = await googleDriveGet(FIRE_KEY);
  }

  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isFireCore(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/** Push the diary snapshot to cloud storage (best-effort). */
export const pushDiaryToCloud = async (snapshot: DiaryCloudSnapshot): Promise<void> => {
  const prefs = usePreferencesStore.getState();
  const json = JSON.stringify(snapshot);

  if (isICloudAvailable && prefs.sourceICloud) {
    await icloudSet(DIARY_KEY, json);
  }
  if (isGoogleDriveAvailable && prefs.sourceGoogleDrive) {
    await googleDriveSet(DIARY_KEY, json);
  }
};

/** Pull the diary snapshot from cloud storage (validated). */
export const pullDiaryFromCloud = async (): Promise<DiaryCloudSnapshot | null> => {
  const prefs = usePreferencesStore.getState();
  let raw: string | null = null;

  if (isICloudAvailable && prefs.sourceICloud) {
    raw = await icloudGet(DIARY_KEY);
  }
  if (!raw && isGoogleDriveAvailable && prefs.sourceGoogleDrive) {
    raw = await googleDriveGet(DIARY_KEY);
  }

  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isDiaryCloudSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/** Remove all schedule entries from cloud storage. */
export const clearCloudSchedules = async (): Promise<void> => {
  if (isICloudAvailable) {
    const keys = await icloudGetAllKeys();
    await Promise.all(
      keys.filter((k) => k.startsWith(SCHEDULE_PREFIX)).map((k) => icloudRemove(k)),
    );
  }
  if (isGoogleDriveAvailable) {
    const keys = await googleDriveGetAllKeys();
    await Promise.all(
      keys
        .filter((k) => k.startsWith(SCHEDULE_PREFIX.replace(/[^a-zA-Z0-9_-]/g, '_')))
        .map((k) => googleDriveRemove(k)),
    );
  }
};
