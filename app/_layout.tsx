import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAppBootstrap } from '@hooks/useAppBootstrap';
import { useIsDark } from '@hooks/usePalette';
import '@i18n';
import { usePreferencesStore } from '@stores/preferences.store';

/**
 * Root layout. Wraps the whole tree in gesture handler / safe-area providers
 * and exposes a stack so we can later push modals at the root level if needed.
 * The `(tabs)` group becomes the only top-level screen of that stack.
 */
export default function RootLayout() {
  useAppBootstrap();
  const isDark = useIsDark();
  const language = usePreferencesStore((s) => s.language);
  const { i18n } = useTranslation();
  const router = useRouter();

  // Native UIUserInterfaceStyle is synced in preferences.store.ts — both in
  // setTheme() and onRehydrateStorage() — so it updates atomically with the
  // palette, before React re-renders.  No useEffect needed here.

  useEffect(() => {
    if (i18n.language !== language) {
      void i18n.changeLanguage(language);
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
          </Stack>
          <StatusBar style={isDark ? 'light' : 'dark'} />
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
