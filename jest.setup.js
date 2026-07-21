/**
 * Global jest setup — registers mocks for native modules that pure-logic
 * modules pull in transitively (e.g. a util → store → AsyncStorage chain).
 */

// Official AsyncStorage mock: an in-memory implementation, so stores that
// hydrate through it don't crash on a null NativeModule under jest.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
