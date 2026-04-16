import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';

import { usePalette } from '@hooks/usePalette';
import { usePreferencesStore } from '@stores/preferences.store';

export const unstable_settings = {
  initialRouteName: '(my)',
};

const iosVersion =
  Platform.OS === 'ios' ? parseInt(String(Platform.Version), 10) : 0;
const supportsLiquidGlass = iosVersion >= 26;

/**
 * Native tab bar (UITabBarController on iOS, BottomNavigationView on Android).
 *
 * Initial tab: `(my)` if a default group is pinned, otherwise `(groups)`.
 *
 * iOS 26+: Liquid Glass blur (`systemChromeMaterial`), `minimizeBehavior="never"`.
 * iOS 15–18: solid `backgroundColor` from palette + `disableTransparentOnScrollEdge`
 *            to avoid the transparent scroll-edge appearance bug.
 */
export default function TabsLayout() {
  const { t } = useTranslation();
  const palette = usePalette();
  const router = useRouter();
  const redirectDone = useRef(false);

  useEffect(() => {
    const redirectIfNeeded = () => {
      if (redirectDone.current) return;
      redirectDone.current = true;
      if (!usePreferencesStore.getState().defaultGroup) {
        router.replace('/(tabs)/(groups)');
      }
    };

    if (usePreferencesStore.persist.hasHydrated()) {
      redirectIfNeeded();
      return;
    }

    return usePreferencesStore.persist.onFinishHydration(redirectIfNeeded);
  }, [router]);

  const triggerProps = supportsLiquidGlass
    ? {}
    : { disableTransparentOnScrollEdge: true as const };

  return (
    <NativeTabs
      minimizeBehavior={supportsLiquidGlass ? 'never' : undefined}
      blurEffect={supportsLiquidGlass ? 'systemChromeMaterial' : undefined}
      backgroundColor={supportsLiquidGlass ? undefined : palette.card}
    >
      <NativeTabs.Trigger name="(my)" {...triggerProps}>
        <Icon sf="calendar" />
        <Label>{t('tabs.my')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(groups)" {...triggerProps}>
        <Icon sf="person.3.fill" />
        <Label>{t('tabs.groups')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(employees)" {...triggerProps}>
        <Icon sf="person.text.rectangle.fill" />
        <Label>{t('tabs.employees')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(settings)" {...triggerProps}>
        <Icon sf="gearshape.fill" />
        <Label>{t('tabs.settings')}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
