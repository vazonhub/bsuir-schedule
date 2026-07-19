import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View, requireNativeComponent } from 'react-native';

const BANNER_PLACEMENT_IOS = process.env.EXPO_PUBLIC_UNITY_BANNER_PLACEMENT_IOS ?? 'ios_banner';
const BANNER_PLACEMENT_ANDROID =
  process.env.EXPO_PUBLIC_UNITY_BANNER_PLACEMENT_ANDROID ?? 'android_banner';

const placementId = Platform.OS === 'ios' ? BANNER_PLACEMENT_IOS : BANNER_PLACEMENT_ANDROID;

interface NativeBannerProps {
  placementId: string;
  style?: object;
}

// requireNativeComponent works on both Paper and Fabric.
// UIManager.getViewManagerConfig is Paper-only and returns null on Fabric,
// so we just try to create the component and catch if unavailable.
let NativeBannerView: React.ComponentType<NativeBannerProps> | null = null;
try {
  NativeBannerView = requireNativeComponent<NativeBannerProps>('UnityBannerView');
} catch {
  // Native module not available.
}

interface Props {
  /** Horizontal margin to match screen padding. */
  marginHorizontal?: number;
}

export const UnityBanner = ({ marginHorizontal = 0 }: Props) => {
  const [ready, setReady] = useState(false);

  // Delay render slightly so SDK has time to initialize
  useEffect(() => {
    if (!NativeBannerView) return;
    const timer = setTimeout(() => setReady(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!NativeBannerView || !ready) return null;

  return (
    <View style={[styles.container, { marginHorizontal }]}>
      <NativeBannerView placementId={placementId} style={styles.banner} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 12,
  },
  banner: {
    width: 320,
    height: 50,
  },
});
