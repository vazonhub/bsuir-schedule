import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
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

  useEffect(() => {
    if (i18n.language !== language) {
      void i18n.changeLanguage(language);
    }
  }, [language, i18n]);

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
