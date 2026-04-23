import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  /** Timestamp (ms) when the entry was written. */
  storedAt: number;
}

const PREFIX = 'cache:';

/**
 * Lightweight TTL cache backed by AsyncStorage.
 *
 * - `get` returns `null` if missing or expired.
 * - `set` stores data with a timestamp; TTL is checked on read.
 * - `invalidate` removes a single key.
 */
export const cache = {
  async get<T>(key: string, ttlMs: number): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(PREFIX + key);
      if (!raw) return null;
      const entry: CacheEntry<T> = JSON.parse(raw);
      if (Date.now() - entry.storedAt > ttlMs) return null;
      return entry.data;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, data: T): Promise<void> {
    try {
      const entry: CacheEntry<T> = { data, storedAt: Date.now() };
      await AsyncStorage.setItem(PREFIX + key, JSON.stringify(entry));
    } catch {
      // Silently ignore write failures.
    }
  },

  async invalidate(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(PREFIX + key);
    } catch {
      // Silently ignore.
    }
  },
};

/**
 * Remove all TTL-cache entries and the persisted schedule store.
 * Leaves preferences (theme, language, pins) untouched.
 */
export const clearLocalCache = async (): Promise<void> => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter((k) => k.startsWith(PREFIX));
    if (cacheKeys.length > 0) await AsyncStorage.multiRemove(cacheKeys);
    // Also clear the Zustand-persisted schedule store.
    await AsyncStorage.removeItem('schedule-cache-v1');
  } catch {
    // Best-effort.
  }
};

/** TTL constants (milliseconds). */
export const TTL = {
  /** 24 hours — for groups / employees lists. */
  lists: 24 * 60 * 60 * 1000,
  /** 6 hours — for individual schedules. */
  schedule: 6 * 60 * 60 * 1000,
  /** 1 hour — for current week number. */
  currentWeek: 60 * 60 * 1000,
} as const;
