import { HolidaysApi } from '@services/api/holidays.api';
import { cache, TTL } from '@services/cache/cache';
import { useHolidaysStore } from '@stores/holidays.store';
import { getFallbackHolidays } from '@utils/holidays';

const CACHE_KEY_PREFIX = 'holidays-';

/** 30 days TTL — holidays don't change often. */
const HOLIDAYS_TTL = 30 * TTL.lists; // 30 * 24h

export const HolidaysController = {
  /**
   * Sync holidays for the given year.
   * Uses stale-while-revalidate: persisted store serves instantly,
   * API refreshes in background with TTL guard.
   */
  async sync(year: number): Promise<void> {
    const store = useHolidaysStore.getState();
    const cacheKey = CACHE_KEY_PREFIX + year;

    // If store has data and cache is fresh — skip.
    const existing = store.byYear[String(year)];
    if (existing && existing.length > 0) {
      const cached = await cache.get(cacheKey, HOLIDAYS_TTL);
      if (cached) return;
    }

    try {
      const holidays = await HolidaysApi.fetchByYear(year);
      store.setHolidays(year, holidays);
      await cache.set(cacheKey, true);
    } catch {
      // API failed — use fallback if no cached data.
      if (!existing || existing.length === 0) {
        store.setHolidays(year, getFallbackHolidays(year));
      }
    }
  },
};
