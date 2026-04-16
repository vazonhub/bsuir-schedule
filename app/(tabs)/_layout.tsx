import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';

import { usePalette } from '@hooks/usePalette';

export const unstable_settings = {
  initialRouteName: '(amy)',
};

const iosVersion =
  Platform.OS === 'ios' ? parseInt(String(Platform.Version), 10) : 0;
const supportsLiquidGlass = iosVersion >= 26;

/**
 * Native tab bar (UITabBarController on iOS, BottomNavigationView on Android).
 *
 * Initial tab: `(amy)`.
 *
 * iOS 26+: Liquid Glass blur (`systemChromeMaterial`), `minimizeBehavior="never"`.
 * iOS 15–18: solid `backgroundColor` from palette + `disableTransparentOnScrollEdge`
 *            to avoid the transparent scroll-edge appearance bug.
 */
export default function TabsLayout() {
  const { t } = useTranslation();
  const palette = usePalette();

  const triggerProps = supportsLiquidGlass
    ? {}
    : { disableTransparentOnScrollEdge: true as const };

  return (
    <NativeTabs
      minimizeBehavior={supportsLiquidGlass ? 'never' : undefined}
      blurEffect={supportsLiquidGlass ? 'systemChromeMaterial' : undefined}
      backgroundColor={supportsLiquidGlass ? undefined : palette.card}
    >
      <NativeTabs.Trigger name="(amy)" {...triggerProps}>
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
