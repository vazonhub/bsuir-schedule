import * as ICloudKV from 'expo-icloud-kv';

/**
 * Thin wrapper around `expo-icloud-kv` (NSUbiquitousKeyValueStore).
 * Falls back to no-ops on Android — every call resolves to a safe empty value.
 */

/** Read a string value from iCloud KV Store. Returns `null` if missing or not iOS. */
export const icloudGet = async (key: string): Promise<string | null> => {
  try {
    return await ICloudKV.getItem(key);
  } catch {
    return null;
  }
};

/** Write a string value to iCloud KV Store. No-op on Android. */
export const icloudSet = async (key: string, value: string): Promise<void> => {
  try {
    await ICloudKV.setItem(key, value);
  } catch {
    // Silently ignore — iCloud sync is best-effort.
  }
};

/** Remove a key from iCloud KV Store. */
export const icloudRemove = async (key: string): Promise<void> => {
  try {
    await ICloudKV.removeItem(key);
  } catch {
    // Silently ignore.
  }
};

/** Get all keys currently stored in iCloud KV Store. */
export const icloudGetAllKeys = async (): Promise<string[]> => {
  try {
    return await ICloudKV.getAllKeys();
  } catch {
    return [];
  }
};

/** True if iCloud KV Store is available on this platform. */
export const isICloudAvailable = ICloudKV.isAvailable;
