import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Text, TextInput } from 'react-native';

import { UpdateBadge } from '@components/UpdateBadge';
import { UpdateModal } from '@components/UpdateModal';
import { AppVersionController } from '@controllers/appVersion.controller';
import { useAppBootstrap } from '@hooks/useAppBootstrap';
import { useIsDark, usePalette } from '@hooks/usePalette';
import '@i18n';
import { configureGoogleSignIn } from '@services/cloud/googleAuth';
import { useAppVersionStore } from '@stores/appVersion.store';
import { useDeepLinkStore } from '@stores/deepLink.store';
import { usePreferencesStore } from '@stores/preferences.store';

/**
 * Root layout. Wraps the whole tree in gesture handler / safe-area providers
 * and exposes a stack so we can later push modals at the root level if needed.
 * The `(tabs)` group becomes the only top-level screen of that stack.
 */
// Limit font scaling for accessibility to 2× by default so that text
// doesn't overflow fixed-layout containers. Individual components can
// override this via textProps() or an explicit maxFontSizeMultiplier prop.
{
  const t = Text as unknown as { defaultProps?: Record<string, unknown> };
  const ti = TextInput as unknown as { defaultProps?: Record<string, unknown> };
  (t.defaultProps ??= {}).maxFontSizeMultiplier = 2.0;
  (ti.defaultProps ??= {}).maxFontSizeMultiplier = 2.0;
}

configureGoogleSignIn();

// Anchor the root stack to the `(tabs)` group so a cold start (and the
// dev-client launch URL) deterministically resolves to the tabs instead of
// landing on the sitemap / "unmatched route" screen.
export const unstable_settings = {
  initialRouteName: '(tabs)',
};

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

  // Widget tap. Home Screen widget emits `bsuirtime://` (root). Lock Screen
  // accessory widgets emit `bsuirtime://lesson?id=<encoded blockId>` — we
  // stash the id in deepLinkStore so `ScheduleView` (default group) can
  // auto-open the sheet once its schedule is mounted.
  useEffect(() => {
    const handle = (url: string | null) => {
      if (!url || !url.startsWith('bsuirtime://')) return;
      try {
        const parsed = Linking.parse(url);
        if (parsed.hostname === 'lesson') {
          const raw = parsed.queryParams?.id;
          const id = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : null;
          if (id) useDeepLinkStore.getState().setPendingLessonBlockId(id);
        }
      } catch {
        // Malformed URL — fall through to the default-tab navigation below.
      }
      router.navigate('/(tabs)/(amy)');
    };

    void Linking.getInitialURL().then(handle);
    const subscription = Linking.addEventListener('url', (event) => handle(event.url));
    return () => subscription.remove();
  }, [router]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Palette.background }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <Stack screenOptions={{
            headerShown: false,
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
