import { HolidaysApi } from '@services/api/holidays.api';
import { cache, TTL } from '@services/cache/cache';
import { useHolidaysStore } from '@stores/holidays.store';
import { usePreferencesStore } from '@stores/preferences.store';
import { getFallbackHolidays } from '@utils/holidays';

const CACHE_KEY_PREFIX = 'holidays-';

/** 30 days TTL — holidays don't change often. */
const HOLIDAYS_TTL = 30 * TTL.lists; // 30 * 24h

const getLocale = () => {
  const lang = usePreferencesStore.getState().language;
  return lang === 'en' ? 'en' : 'be';
};

export const HolidaysController = {
  /**
   * Sync holidays for the given year.
   * Uses stale-while-revalidate: persisted store serves instantly,
   * API refreshes in background with TTL guard.
   *
   * @param force — bypass cache (used after language change).
   */
  async sync(year: number, force = false): Promise<void> {
    const store = useHolidaysStore.getState();
    const locale = getLocale();
    const cacheKey = `${CACHE_KEY_PREFIX}${year}-${locale}`;

    if (!force) {
      // If store has data and cache is fresh — skip.
      const existing = store.byYear[String(year)];
      if (existing && existing.length > 0) {
        const cached = await cache.get(cacheKey, HOLIDAYS_TTL);
        if (cached) return;
      }
    }

    try {
      const holidays = await HolidaysApi.fetchByYear(year, locale === 'en');
      store.setHolidays(year, holidays);
      await cache.set(cacheKey, true);
    } catch {
      // API failed — use fallback if no cached data.
      const existing = store.byYear[String(year)];
      if (!existing || existing.length === 0) {
        store.setHolidays(year, getFallbackHolidays(year));
      }
    }
  },
};

// Re-fetch holidays when the user switches language.
let _prevLang = usePreferencesStore.getState().language;
usePreferencesStore.subscribe((state) => {
  if (state.language !== _prevLang) {
    _prevLang = state.language;
    void HolidaysController.sync(new Date().getFullYear(), true);
  }
});
