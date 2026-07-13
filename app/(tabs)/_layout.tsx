import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';

import { usePalette, useIsDark } from '@hooks/usePalette';

const isAndroid = Platform.OS === 'android';

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
  const isDark = useIsDark();

  // iOS < 26: backgroundColor + disableTransparentOnScrollEdge are set at the
  // NativeTabs level (not per-trigger) so the native UITabBar updates
  // immediately when the palette changes, instead of waiting for a tab tap.
  return (
    <NativeTabs
      key={supportsLiquidGlass ? undefined : isDark ? 'dark' : 'light'}
      minimizeBehavior={supportsLiquidGlass ? 'never' : undefined}
      blurEffect={supportsLiquidGlass ? 'systemChromeMaterial' : undefined}
      backgroundColor={supportsLiquidGlass ? undefined : palette.card}
      disableTransparentOnScrollEdge={!supportsLiquidGlass || undefined}
      labelVisibilityMode={isAndroid ? 'unlabeled' : 'labeled'}
      tintColor={isAndroid ? palette.accent : undefined}
      indicatorColor={isAndroid ? `${palette.accent}26` : undefined}
      labelStyle={isAndroid ? { fontSize: 12 } : undefined}
    >
      <NativeTabs.Trigger name="(amy)">
        <Icon sf="calendar" androidSrc={<VectorIcon family={MaterialCommunityIcons} name="calendar" />} />
        <Label>{t('tabs.my')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(schedule)">
        <Icon sf="list.bullet.rectangle.fill" androidSrc={<VectorIcon family={MaterialIcons} name="view-list" />} />
        <Label>{t('tabs.schedule')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(settings)">
        <Icon sf="gearshape.fill" androidSrc={<VectorIcon family={MaterialIcons} name="settings" />} />
        <Label>{t('tabs.settings')}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
