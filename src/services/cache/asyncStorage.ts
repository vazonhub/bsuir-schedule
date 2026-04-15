import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

/**
 * `StateStorage` adapter for `zustand/middleware/persist` backed by
 * AsyncStorage. AsyncStorage уже асинхронный и совместим с интерфейсом
 * напрямую, оборачивать в try/catch не нужно — `persist` сам трактует
 * `null` как «ничего не сохранено».
 */
export const asyncStorageAdapter: StateStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};
