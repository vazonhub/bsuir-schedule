import type { ScheduleDto } from '@models/dto';
import { usePreferencesStore } from '@stores/preferences.store';

import { icloudGet, icloudGetAllKeys, icloudRemove, icloudSet, isICloudAvailable } from './icloud';

const SCHEDULE_PREFIX = 'schedule:';

/** Push a schedule to iCloud KV Store (best-effort, fire-and-forget). */
export const pushScheduleToCloud = async (
  key: string,
  data: ScheduleDto,
): Promise<void> => {
  if (!isICloudAvailable) return;
  if (!usePreferencesStore.getState().sourceICloud) return;
  await icloudSet(SCHEDULE_PREFIX + key, JSON.stringify(data));
};

/**
 * Try to load a schedule from iCloud KV Store.
 * Used as a fallback when the API is unreachable.
 */
export const pullScheduleFromCloud = async (
  key: string,
): Promise<ScheduleDto | null> => {
  if (!isICloudAvailable) return null;
  if (!usePreferencesStore.getState().sourceICloud) return null;
  const raw = await icloudGet(SCHEDULE_PREFIX + key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ScheduleDto;
  } catch {
    return null;
  }
};

/** Remove all schedule entries from iCloud KV Store. */
export const clearCloudSchedules = async (): Promise<void> => {
  if (!isICloudAvailable) return;
  const keys = await icloudGetAllKeys();
  await Promise.all(
    keys
      .filter((k) => k.startsWith(SCHEDULE_PREFIX))
      .map((k) => icloudRemove(k)),
  );
};
