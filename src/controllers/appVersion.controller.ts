import Constants from 'expo-constants';

import { fetchStoreVersion } from '@services/api/appVersion';
import { cache, TTL } from '@services/cache/cache';
import { useAppVersionStore } from '@stores/appVersion.store';
import { usePreferencesStore } from '@stores/preferences.store';

const CACHE_KEY = 'app-version-check';

/** Compare two semver-like version strings (e.g. "2.0.0" < "2.1.0"). */
const isVersionNewer = (current: string, remote: string): boolean => {
  const c = current.split('.').map(Number);
  const r = remote.split('.').map(Number);
  for (let i = 0; i < Math.max(c.length, r.length); i++) {
    const cv = c[i] ?? 0;
    const rv = r[i] ?? 0;
    if (rv > cv) return true;
    if (rv < cv) return false;
  }
  return false;
};

export const AppVersionController = {
  /**
   * Fetch latest version info from the store and update the in-memory store.
   * Skipped if the cache is still fresh (TTL = 1 hour).
   */
  async checkForUpdate(): Promise<void> {
    // Only skip if cache is fresh AND in-memory store already has data.
    const hasData = useAppVersionStore.getState().latestVersion !== null;
    if (hasData) {
      const cached = await cache.get(CACHE_KEY, TTL.currentWeek);
      if (cached) return;
    }

    const lang = usePreferencesStore.getState().language;
    const locale = lang === 'en' ? 'en' : 'ru';

    const info = await fetchStoreVersion(locale);
    if (!info) return;

    useAppVersionStore.getState().setVersionInfo(
      info.version,
      info.releaseNotes,
      info.storeUrl,
    );

    await cache.set(CACHE_KEY, true);
  },

  /** Mark the given version's release notes as seen by the user. */
  markAsSeen(version: string): void {
    usePreferencesStore.getState().setLastSeenVersion(version);
  },

  /** Current app version from app.json. */
  get currentVersion(): string {
    return Constants.expoConfig?.version ?? '0.0.0';
  },

  /** Whether the store version is newer than the installed version. */
  get hasUpdate(): boolean {
    const latest = useAppVersionStore.getState().latestVersion;
    if (!latest) return false;
    return isVersionNewer(this.currentVersion, latest);
  },

  /** Whether there are unseen release notes (update or fresh install of new version). */
  get isUnseen(): boolean {
    const latest = useAppVersionStore.getState().latestVersion;
    if (!latest) return false;
    const lastSeen = usePreferencesStore.getState().lastSeenVersion;
    return lastSeen !== latest;
  },
};
