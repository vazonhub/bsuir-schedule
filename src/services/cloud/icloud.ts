import { NativeModules, Platform } from 'react-native';

/**
 * Thin wrapper around the native `ICloudKVStore` module
 * (NSUbiquitousKeyValueStore). Falls back to no-ops on Android.
 */

interface ICloudKVStoreNative {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
}

const native: ICloudKVStoreNative | null =
  Platform.OS === 'ios' ? NativeModules.ICloudKVStore : null;

/** Read a string value from iCloud KV Store. Returns `null` if missing or not iOS. */
export const icloudGet = async (key: string): Promise<string | null> => {
  if (!native) return null;
  try {
    return await native.getItem(key);
  } catch {
    return null;
  }
};

/** Write a string value to iCloud KV Store. No-op on Android. */
export const icloudSet = async (key: string, value: string): Promise<void> => {
  if (!native) return;
  try {
    await native.setItem(key, value);
  } catch {
    // Silently ignore — iCloud sync is best-effort.
  }
};

/** Remove a key from iCloud KV Store. */
export const icloudRemove = async (key: string): Promise<void> => {
  if (!native) return;
  try {
    await native.removeItem(key);
  } catch {
    // Silently ignore.
  }
};

/** Get all keys currently stored in iCloud KV Store. */
export const icloudGetAllKeys = async (): Promise<string[]> => {
  if (!native) return [];
  try {
    return await native.getAllKeys();
  } catch {
    return [];
  }
};

/** True if iCloud KV Store is available on this platform. */
export const isICloudAvailable = Platform.OS === 'ios' && native != null;
