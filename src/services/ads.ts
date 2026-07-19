import { Platform } from 'react-native';

const GAME_ID_IOS = process.env.EXPO_PUBLIC_UNITY_GAME_ID_IOS ?? '';
const GAME_ID_ANDROID = process.env.EXPO_PUBLIC_UNITY_GAME_ID_ANDROID ?? '';
const PLACEMENT_IOS = process.env.EXPO_PUBLIC_UNITY_REWARDED_PLACEMENT_IOS ?? 'rewardedVideo_ios';
const PLACEMENT_ANDROID =
  process.env.EXPO_PUBLIC_UNITY_REWARDED_PLACEMENT_ANDROID ?? 'rewardedVideo_android';

const gameId = Platform.OS === 'ios' ? GAME_ID_IOS : GAME_ID_ANDROID;
const placementId = Platform.OS === 'ios' ? PLACEMENT_IOS : PLACEMENT_ANDROID;

let initialized = false;
let adLoaded = false;

/**
 * Initialize Unity Ads SDK. Call once at app startup.
 */
export const initAds = async (): Promise<void> => {
  if (initialized || !gameId) return;
  try {
    const UnityAds = require('@mrnitrox/react-native-unity-ads-monetization').default;

    UnityAds.setOnUnityAdsLoadListener({
      onAdLoaded: (_id: string) => {
        adLoaded = true;
        console.log('[Ads] Rewarded ad loaded');
      },
      onAdLoadFailed: (_id: string, msg: string) => {
        adLoaded = false;
        console.warn('[Ads] Ad load failed:', msg);
      },
    });

    await UnityAds.initialize(gameId, __DEV__);
    initialized = true;
    console.log('[Ads] Unity Ads initialized, gameId:', gameId, 'placement:', placementId);
    loadRewardedAd();
  } catch (e) {
    console.warn('[Ads] Init failed:', e);
  }
};

/** Pre-load a rewarded ad so it's ready when needed. */
export const loadRewardedAd = (): void => {
  if (!initialized) return;
  adLoaded = false;
  try {
    const UnityAds = require('@mrnitrox/react-native-unity-ads-monetization').default;
    void UnityAds.loadAd(placementId);
  } catch {
    // Ignore.
  }
};

/**
 * Show a rewarded video ad.
 *
 * Returns:
 * - `true`  if ad was watched (COMPLETED) or ad was unavailable (allow action)
 * - `false` only if user explicitly skipped the ad
 */
export const showRewardedAd = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // If SDK not initialized or ad not loaded, allow the action
    if (!initialized || !adLoaded) {
      console.log('[Ads] Ad not available, allowing action');
      // Try to load for next time
      if (initialized) loadRewardedAd();
      resolve(true);
      return;
    }

    try {
      const UnityAds = require('@mrnitrox/react-native-unity-ads-monetization').default;

      UnityAds.setOnUnityAdsShowListener({
        onShowStart: () => {
          console.log('[Ads] Ad show started');
        },
        onShowComplete: (_id: string, state: 'SKIPPED' | 'COMPLETED') => {
          console.log('[Ads] Ad show complete:', state);
          loadRewardedAd();
          // COMPLETED = watched, SKIPPED = user skipped
          resolve(state === 'COMPLETED');
        },
        onShowFailed: (_id: string, msg: string) => {
          console.warn('[Ads] Ad show failed:', msg);
          loadRewardedAd();
          // Ad failed to show — allow the action
          resolve(true);
        },
        onShowClick: () => {},
      });

      void UnityAds.showAd(placementId);
    } catch {
      resolve(true);
    }
  });
};
