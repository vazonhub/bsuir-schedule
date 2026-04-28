import type { ScheduleDto } from '@models/dto';
import { usePreferencesStore } from '@stores/preferences.store';

import {
  googleDriveGet,
  googleDriveGetAllKeys,
  googleDriveRemove,
  googleDriveSet,
  isGoogleDriveAvailable,
} from './googleDrive';
import { icloudGet, icloudGetAllKeys, icloudRemove, icloudSet, isICloudAvailable } from './icloud';

const SCHEDULE_PREFIX = 'schedule:';

/** Push a schedule to cloud storage (best-effort, fire-and-forget). */
export const pushScheduleToCloud = async (
  key: string,
  data: ScheduleDto,
): Promise<void> => {
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
export const pullScheduleFromCloud = async (
  key: string,
): Promise<ScheduleDto | null> => {
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

/** Remove all schedule entries from cloud storage. */
export const clearCloudSchedules = async (): Promise<void> => {
  if (isICloudAvailable) {
    const keys = await icloudGetAllKeys();
    await Promise.all(
      keys
        .filter((k) => k.startsWith(SCHEDULE_PREFIX))
        .map((k) => icloudRemove(k)),
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
