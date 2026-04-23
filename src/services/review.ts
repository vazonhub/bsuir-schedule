import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const STREAK_KEY = 'review:streak_dates';
const ASKED_KEY = 'review:asked';

const CONSECUTIVE_DAYS_THRESHOLD = 5;

/** ISO date string without time, e.g. "2026-04-23". */
const todayISO = (): string => new Date().toISOString().slice(0, 10);

/**
 * Record today's visit and, once the user has used the app for
 * `CONSECUTIVE_DAYS_THRESHOLD` consecutive days, request an in-app review.
 *
 * Safe to call on every foreground — it short-circuits quickly when:
 * - today was already recorded, or
 * - the review was already requested once.
 */
export const trackUsageAndMaybeRequestReview = async (): Promise<void> => {
  try {
    const [rawDates, asked] = await Promise.all([
      AsyncStorage.getItem(STREAK_KEY),
      AsyncStorage.getItem(ASKED_KEY),
    ]);

    if (asked === '1') return;

    const today = todayISO();
    const dates: string[] = rawDates ? (JSON.parse(rawDates) as string[]) : [];

    // Already recorded today — nothing to do.
    if (dates[dates.length - 1] === today) return;

    // Check if yesterday is in the list (consecutive).
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = yesterday.toISOString().slice(0, 10);

    let newDates: string[];
    if (dates.length > 0 && dates[dates.length - 1] === yesterdayISO) {
      // Extend streak.
      newDates = [...dates, today];
    } else {
      // Streak broken — start fresh.
      newDates = [today];
    }

    // Keep only the last N dates to avoid unbounded growth.
    if (newDates.length > CONSECUTIVE_DAYS_THRESHOLD) {
      newDates = newDates.slice(-CONSECUTIVE_DAYS_THRESHOLD);
    }

    await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(newDates));

    if (newDates.length >= CONSECUTIVE_DAYS_THRESHOLD) {
      const isAvailable = await StoreReview.isAvailableAsync();
      if (!isAvailable) return;

      await StoreReview.requestReview();
      await AsyncStorage.setItem(ASKED_KEY, '1');
    }
  } catch {
    // Review is non-critical — swallow errors silently.
  }
};
