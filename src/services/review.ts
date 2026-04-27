import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const DAYS_KEY = 'review:unique_days';
const ASKED_KEY = 'review:asked';

const UNIQUE_DAYS_THRESHOLD = 5;

/** ISO date string without time, e.g. "2026-04-23". */
const todayISO = (): string => new Date().toISOString().slice(0, 10);

/**
 * Record today's visit and, once the user has opened the app on
 * `UNIQUE_DAYS_THRESHOLD` unique days (not necessarily consecutive),
 * request an in-app review.
 *
 * Safe to call on every foreground — it short-circuits quickly when:
 * - today was already recorded, or
 * - the review was already requested once.
 */
export const trackUsageAndMaybeRequestReview = async (): Promise<void> => {
  try {
    const [rawCount, asked] = await Promise.all([
      AsyncStorage.getItem(DAYS_KEY),
      AsyncStorage.getItem(ASKED_KEY),
    ]);

    if (asked === '1') return;

    const stored: { count: number; lastDay: string } = rawCount
      ? (JSON.parse(rawCount) as { count: number; lastDay: string })
      : { count: 0, lastDay: '' };

    const today = todayISO();

    // Already recorded today — nothing to do.
    if (stored.lastDay === today) return;

    stored.count += 1;
    stored.lastDay = today;

    await AsyncStorage.setItem(DAYS_KEY, JSON.stringify(stored));

    if (stored.count >= UNIQUE_DAYS_THRESHOLD) {
      const isAvailable = await StoreReview.isAvailableAsync();
      if (!isAvailable) return;

      await StoreReview.requestReview();
      await AsyncStorage.setItem(ASKED_KEY, '1');
    }
  } catch {
    // Review is non-critical — swallow errors silently.
  }
};
