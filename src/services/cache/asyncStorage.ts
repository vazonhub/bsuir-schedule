import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

/**
 * `StateStorage` adapter for `zustand/middleware/persist` backed by
 * AsyncStorage. AsyncStorage is already asynchronous and matches the
 * interface directly, no try/catch wrapping needed — `persist` itself
 * treats `null` as "nothing stored".
 */
export const asyncStorageAdapter: StateStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};
