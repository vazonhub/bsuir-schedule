import Constants from 'expo-constants';

import { fetchStoreVersion } from '@services/api/appVersion';

let nativeVersion: string | null = null;
try {
  // expo-application requires a native rebuild; fall back to Constants if unavailable.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Application = require('expo-application') as { nativeApplicationVersion: string | null };
  nativeVersion = Application.nativeApplicationVersion;
} catch {
  // Native module not available (e.g. dev client not rebuilt yet).
}
import { cache, TTL } from '@services/cache/cache';
import { useAppVersionStore } from '@stores/appVersion.store';
import { usePreferencesStore, waitForHydration } from '@stores/preferences.store';

const cacheKey = (locale: string) => `app-version-check-${locale}`;

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
    // Wait for preferences to load from storage so we read the real language.
    await waitForHydration();

    const lang = usePreferencesStore.getState().language;
    const locale = lang === 'en' ? 'en' : 'ru';
    const key = cacheKey(locale);

    // Only skip if cache is fresh AND in-memory store already has data.
    const hasData = useAppVersionStore.getState().latestVersion !== null;
    if (hasData) {
      const cached = await cache.get(key, TTL.currentWeek);
      if (cached) return;
    }

    const info = await fetchStoreVersion(locale);
    if (!info) return;

    useAppVersionStore.getState().setVersionInfo(info.version, info.releaseNotes, info.storeUrl);

    await cache.set(key, true);
  },

  /** Mark the given version's release notes as seen by the user. */
  markAsSeen(version: string): void {
    usePreferencesStore.getState().setLastSeenVersion(version);
  },

  /** Current app version from the native build (versionName on Android, CFBundleShortVersionString on iOS). */
  get currentVersion(): string {
    return nativeVersion ?? Constants.expoConfig?.version ?? '0.0.0';
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

// Re-fetch release notes when the user switches language.
let _prevLang = usePreferencesStore.getState().language;
usePreferencesStore.subscribe((state) => {
  if (state.language !== _prevLang) {
    _prevLang = state.language;
    void AppVersionController.checkForUpdate();
  }
});
