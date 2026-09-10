import { Platform } from 'react-native';

const GAME_ID_IOS = process.env.EXPO_PUBLIC_UNITY_GAME_ID_IOS ?? '';
const GAME_ID_ANDROID = process.env.EXPO_PUBLIC_UNITY_GAME_ID_ANDROID ?? '';
const REWARDED_PLACEMENT_IOS =
  process.env.EXPO_PUBLIC_UNITY_REWARDED_PLACEMENT_IOS ?? 'rewardedVideo_ios';
const REWARDED_PLACEMENT_ANDROID =
  process.env.EXPO_PUBLIC_UNITY_REWARDED_PLACEMENT_ANDROID ?? 'rewardedVideo_android';
const INTERSTITIAL_PLACEMENT_IOS =
  process.env.EXPO_PUBLIC_UNITY_INTERSTITIAL_PLACEMENT_IOS ?? 'ios_interstitial';
const INTERSTITIAL_PLACEMENT_ANDROID =
  process.env.EXPO_PUBLIC_UNITY_INTERSTITIAL_PLACEMENT_ANDROID ?? 'android_interstitial';

const gameId = Platform.OS === 'ios' ? GAME_ID_IOS : GAME_ID_ANDROID;
const rewardedPlacementId =
  Platform.OS === 'ios' ? REWARDED_PLACEMENT_IOS : REWARDED_PLACEMENT_ANDROID;
const interstitialPlacementId =
  Platform.OS === 'ios' ? INTERSTITIAL_PLACEMENT_IOS : INTERSTITIAL_PLACEMENT_ANDROID;

let initialized = false;
// Which placements currently have an ad ready. Keyed by placement id so rewarded
// and interstitial track their loaded state independently.
const loadedPlacements = new Set<string>();

const getUnityAds = () => require('@mrnitrox/react-native-unity-ads-monetization').default;

/**
 * Initialize Unity Ads SDK. Call once at app startup.
 */
export const initAds = async (): Promise<void> => {
  if (initialized || !gameId) return;
  try {
    const UnityAds = getUnityAds();

    UnityAds.setOnUnityAdsLoadListener({
      onAdLoaded: (id: string) => {
        loadedPlacements.add(id);
        console.log('[Ads] Ad loaded:', id);
      },
      onAdLoadFailed: (id: string, msg: string) => {
        loadedPlacements.delete(id);
        console.warn('[Ads] Ad load failed:', id, msg);
      },
    });

    await UnityAds.initialize(gameId, __DEV__);
    initialized = true;
    console.log('[Ads] Unity Ads initialized, gameId:', gameId);
    loadRewardedAd();
    loadInterstitialAd();
  } catch (e) {
    console.warn('[Ads] Init failed:', e);
  }
};

/** Pre-load an ad for a placement so it's ready when needed. */
const loadAd = (placementId: string): void => {
  if (!initialized) return;
  loadedPlacements.delete(placementId);
  try {
    void getUnityAds().loadAd(placementId);
  } catch {
    // Ignore.
  }
};

/** Pre-load a rewarded ad so it's ready when needed. */
export const loadRewardedAd = (): void => loadAd(rewardedPlacementId);

/** Pre-load an interstitial ad so it's ready when needed. */
export const loadInterstitialAd = (): void => loadAd(interstitialPlacementId);

/**
 * Show a full-screen ad for a placement.
 *
 * Resolves:
 * - `true`  if ad was watched to COMPLETED, or the ad was unavailable / failed
 *           to show (i.e. the caller's action should be allowed to proceed)
 * - `false` only if the user explicitly skipped the ad
 */
const showAd = (placementId: string, reload: () => void): Promise<boolean> => {
  return new Promise((resolve) => {
    // If SDK not initialized or nothing loaded for this placement, allow the action.
    if (!initialized || !loadedPlacements.has(placementId)) {
      console.log('[Ads] Ad not available for', placementId, '— allowing action');
      if (initialized) reload(); // Try to load for next time.
      resolve(true);
      return;
    }

    try {
      const UnityAds = getUnityAds();

      UnityAds.setOnUnityAdsShowListener({
        onShowStart: () => {},
        onShowComplete: (id: string, state: 'SKIPPED' | 'COMPLETED') => {
          loadedPlacements.delete(id);
          reload();
          // COMPLETED = watched, SKIPPED = user skipped.
          resolve(state === 'COMPLETED');
        },
        onShowFailed: (id: string, msg: string) => {
          console.warn('[Ads] Ad show failed:', id, msg);
          loadedPlacements.delete(id);
          reload();
          // Ad failed to show — allow the action.
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

/**
 * Show a rewarded video ad.
 *
 * Returns `true` if the ad was watched (COMPLETED) or was unavailable (allow the
 * action), `false` only if the user explicitly skipped it.
 */
export const showRewardedAd = (): Promise<boolean> => showAd(rewardedPlacementId, loadRewardedAd);

/**
 * Show an interstitial ad. Fire-and-forget: the caller's flow proceeds regardless
 * of whether the ad was shown, watched or unavailable.
 */
export const showInterstitialAd = async (): Promise<void> => {
  await showAd(interstitialPlacementId, loadInterstitialAd);
};
