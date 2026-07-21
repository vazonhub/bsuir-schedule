import { requireOptionalNativeModule } from 'expo-modules-core';

/**
 * Phone-side bridge to the paired Apple Watch (WatchConnectivity / WCSession).
 *
 * The native module is only present on iOS. On Android / web
 * `requireOptionalNativeModule` returns `null`, so every export degrades to a
 * safe no-op — callers never need a platform check.
 */
interface WatchBridgeNative {
  /** WCSession.isSupported() — false on iPad / non-paired-capable devices. */
  isSupported(): boolean;
  /** True when an Apple Watch is currently paired with this iPhone. */
  isPaired(): boolean;
  /** True when our watch app is installed on the paired watch. */
  isWatchAppInstalled(): boolean;
  /**
   * Push the latest snapshot JSON to the watch via `updateApplicationContext`
   * (latest-state-wins). Falls back to a queued `transferUserInfo` if the
   * application-context update throws. Returns false if delivery could not be
   * attempted at all.
   */
  updateContext(json: string): boolean;
}

const native = requireOptionalNativeModule<WatchBridgeNative>('WatchBridge');

/** Whether WatchConnectivity is available on this device. */
export const isWatchSupported = (): boolean => native?.isSupported() ?? false;

/** Whether an Apple Watch is paired with this iPhone. */
export const isWatchPaired = (): boolean => {
  try {
    return native?.isPaired() ?? false;
  } catch {
    return false;
  }
};

/** Whether the Bsuir Time watch app is installed on the paired watch. */
export const isWatchAppInstalled = (): boolean => {
  try {
    return native?.isWatchAppInstalled() ?? false;
  } catch {
    return false;
  }
};

/**
 * Send a snapshot (already JSON-encoded on the caller side) to the watch.
 * Returns true if delivery was attempted, false if the bridge is unavailable.
 */
export const sendWatchContext = (json: string): boolean => {
  if (!native) return false;
  try {
    return native.updateContext(json);
  } catch {
    return false;
  }
};
