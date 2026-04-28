import { Platform } from 'react-native';

const BUNDLE_ID = 'by.vazon.bsuirschedule';

const APP_STORE_URL = 'https://apps.apple.com/by/app/bsuir-time/id6762343557';
const PLAY_MARKET_URL = `https://play.google.com/store/apps/details?id=${BUNDLE_ID}`;

export interface StoreVersionInfo {
  version: string;
  releaseNotes: string;
  storeUrl: string;
}

/**
 * Fetch the latest app version and release notes from the iTunes Lookup API.
 *
 * - `locale === 'ru'` → `country=by` (Russian release notes)
 * - `locale === 'en'` → `country=us` (English release notes)
 *
 * Used as the single source of truth for both iOS and Android.
 */
export const fetchStoreVersion = async (
  locale: 'ru' | 'en',
): Promise<StoreVersionInfo | null> => {
  const country = locale === 'en' ? 'us' : 'by';
  const url = `https://itunes.apple.com/lookup?bundleId=${BUNDLE_ID}&country=${country}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const json = (await res.json()) as {
      resultCount: number;
      results: Array<{
        version?: string;
        releaseNotes?: string;
      }>;
    };

    const result = json.results[0];
    if (!result?.version) return null;

    return {
      version: result.version,
      releaseNotes: result.releaseNotes ?? '',
      storeUrl: Platform.OS === 'ios' ? APP_STORE_URL : PLAY_MARKET_URL,
    };
  } catch {
    return null;
  }
};
