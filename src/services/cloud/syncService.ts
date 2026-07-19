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

/**
 * Результат чтения из облака. `invalid` (есть блоб, но он не прошёл
 * валидацию — мусор или другая версия схемы) отличается от `empty`,
 * чтобы вызывающий код не принял чужой блоб за «облако пусто» и не
 * затёр его своим push'ем.
 */
export type CloudPullResult<T> =
  | { status: 'ok'; data: T }
  | { status: 'empty' }
  | { status: 'invalid' };

/** Push a JSON value to every enabled cloud backend (best-effort). */
const pushJsonToCloud = async (key: string, value: unknown): Promise<void> => {
  const prefs = usePreferencesStore.getState();
  const json = JSON.stringify(value);

  if (isICloudAvailable && prefs.sourceICloud) {
    await icloudSet(key, json);
  }
  if (isGoogleDriveAvailable && prefs.sourceGoogleDrive) {
    await googleDriveSet(key, json);
  }
};

/** Read a raw string from the first enabled backend that has it. */
const pullRawFromCloud = async (key: string): Promise<string | null> => {
  const prefs = usePreferencesStore.getState();
  let raw: string | null = null;

  if (isICloudAvailable && prefs.sourceICloud) {
    raw = await icloudGet(key);
  }
  if (!raw && isGoogleDriveAvailable && prefs.sourceGoogleDrive) {
    raw = await googleDriveGet(key);
  }
  return raw;
};

/** Pull + parse + validate a JSON value from cloud storage. */
const pullJsonFromCloud = async <T>(
  key: string,
  guard: (x: unknown) => x is T,
): Promise<CloudPullResult<T>> => {
  const raw = await pullRawFromCloud(key);
  if (!raw) return { status: 'empty' };
  try {
    const parsed: unknown = JSON.parse(raw);
    return guard(parsed) ? { status: 'ok', data: parsed } : { status: 'invalid' };
  } catch {
    return { status: 'invalid' };
  }
};

/** Push a schedule to cloud storage (best-effort, fire-and-forget). */
export const pushScheduleToCloud = (key: string, data: ScheduleDto): Promise<void> =>
  pushJsonToCloud(SCHEDULE_PREFIX + key, data);

/**
 * Try to load a schedule from cloud storage.
 * Used as a fallback when the API is unreachable.
 */
export const pullScheduleFromCloud = async (key: string): Promise<ScheduleDto | null> => {
  const res = await pullJsonFromCloud(
    SCHEDULE_PREFIX + key,
    (x): x is ScheduleDto => typeof x === 'object' && x != null && !Array.isArray(x),
  );
  return res.status === 'ok' ? res.data : null;
};

/** Push the global fire snapshot to cloud storage (best-effort). */
export const pushFireToCloud = (core: FireCore): Promise<void> => pushJsonToCloud(FIRE_KEY, core);

/** Pull the global fire snapshot from cloud storage (validated). */
export const pullFireFromCloud = async (): Promise<FireCore | null> => {
  const res = await pullJsonFromCloud(FIRE_KEY, isFireCore);
  return res.status === 'ok' ? res.data : null;
};

/** Push the diary snapshot to cloud storage (best-effort). */
export const pushDiaryToCloud = (snapshot: DiaryCloudSnapshot): Promise<void> =>
  pushJsonToCloud(DIARY_KEY, snapshot);

/** Pull the diary snapshot from cloud storage (validated). */
export const pullDiaryFromCloud = (): Promise<CloudPullResult<DiaryCloudSnapshot>> =>
  pullJsonFromCloud(DIARY_KEY, isDiaryCloudSnapshot);

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
