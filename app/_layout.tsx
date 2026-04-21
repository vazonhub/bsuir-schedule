import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack, useRouter } from 'expo-router';
import { useURL } from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Appearance } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAppBootstrap } from '@hooks/useAppBootstrap';
import { useIsDark } from '@hooks/usePalette';
import '@i18n';
import type { ThemeChoice } from '@stores/preferences.store';
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
  const incomingUrl = useURL();
  const handledUrl = useRef<string | null>(null);

  const themeChoice = usePreferencesStore((s) => s.theme);

  // Sync native UIUserInterfaceStyle with the user's theme choice.
  // This ensures UITabBarController and other UIKit elements follow
  // the in-app theme, not the system one.
  useEffect(() => {
    const nativeScheme: 'light' | 'dark' | null =
      themeChoice === 'auto' ? null : themeChoice;
    Appearance.setColorScheme(nativeScheme);
  }, [themeChoice]);

  useEffect(() => {
    if (i18n.language !== language) {
      void i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  // Widget tap: navigate to "My" tab.
  // useURL() returns the latest URL that opened/resumed the app.
  // We track handledUrl to avoid re-processing the same URL.
  useEffect(() => {
    if (!incomingUrl) return;
    if (incomingUrl === handledUrl.current) return;
    handledUrl.current = incomingUrl;
    if (incomingUrl.startsWith('bsuirtime://')) {
      router.navigate('/(tabs)/(amy)');
    }
  }, [incomingUrl, router]);

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
