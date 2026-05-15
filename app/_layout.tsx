import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { UpdateBadge } from '@components/UpdateBadge';
import { UpdateModal } from '@components/UpdateModal';
import { AppVersionController } from '@controllers/appVersion.controller';
import { useAppBootstrap } from '@hooks/useAppBootstrap';
import { useIsDark, usePalette } from '@hooks/usePalette';
import '@i18n';
import { configureGoogleSignIn } from '@services/cloud/googleAuth';
import { useAppVersionStore } from '@stores/appVersion.store';
import { usePreferencesStore } from '@stores/preferences.store';

/**
 * Root layout. Wraps the whole tree in gesture handler / safe-area providers
 * and exposes a stack so we can later push modals at the root level if needed.
 * The `(tabs)` group becomes the only top-level screen of that stack.
 */
configureGoogleSignIn();

export default function RootLayout() {
  useAppBootstrap();
  const isDark = useIsDark();
  const Palette = usePalette();
  const language = usePreferencesStore((s) => s.language);
  const { i18n } = useTranslation();
  const router = useRouter();

  const [updateModalVisible, setUpdateModalVisible] = useState(false);

  const latestVersion = useAppVersionStore((s) => s.latestVersion);
  const releaseNotes = useAppVersionStore((s) => s.releaseNotes);
  const storeUrl = useAppVersionStore((s) => s.storeUrl);

  const openUpdateModal = useCallback(() => {
    setUpdateModalVisible(true);
  }, []);

  const closeUpdateModal = useCallback(() => {
    setUpdateModalVisible(false);
    if (latestVersion) {
      AppVersionController.markAsSeen(latestVersion);
    }
  }, [latestVersion]);

  // Native UIUserInterfaceStyle is synced in preferences.store.ts — both in
  // setTheme() and onRehydrateStorage() — so it updates atomically with the
  // palette, before React re-renders.  No useEffect needed here.

  useEffect(() => {
    if (i18n.language !== language) {
      const id = setTimeout(() => {
        void i18n.changeLanguage(language);
      }, 200);
      return () => clearTimeout(id);
    }
  }, [language, i18n]);

  // Widget tap: navigate to "My" tab.
  // Cold-start URLs are handled automatically by expo-router's linking config,
  // so we only need addEventListener for warm-resume (app was backgrounded,
  // widget tap foregrounded it).
  useEffect(() => {
    const subscription = Linking.addEventListener('url', (event) => {
      if (!event.url.startsWith('bsuirtime://')) return;
      router.navigate('/(tabs)/(amy)');
    });

    return () => subscription.remove();
  }, [router]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Palette.background }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <Stack screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Palette.background },
          }}>
            <Stack.Screen name="(tabs)" />
          </Stack>
          <UpdateBadge onPress={openUpdateModal} />
          <UpdateModal
            visible={updateModalVisible}
            version={latestVersion}
            releaseNotes={releaseNotes}
            storeUrl={storeUrl}
            onClose={closeUpdateModal}
          />
          <StatusBar style={isDark ? 'light' : 'dark'} />
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
