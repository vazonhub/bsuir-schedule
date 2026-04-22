import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';

import { usePalette } from '@hooks/usePalette';

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

  // iOS < 26: solid blur + backgroundColor fallback on every trigger to
  // guarantee both standard AND scrollEdge appearances are opaque.
  const fallbackTabBar = !supportsLiquidGlass
    ? {
        backgroundColor: palette.card,
        blurEffect: 'systemThickMaterial' as const,
        disableTransparentOnScrollEdge: true as const,
      }
    : {};

  return (
    <NativeTabs
      minimizeBehavior={supportsLiquidGlass ? 'never' : undefined}
      blurEffect={supportsLiquidGlass ? 'systemChromeMaterial' : 'systemThickMaterial'}
      backgroundColor={supportsLiquidGlass ? undefined : palette.card}
      labelVisibilityMode="labeled"
      tintColor={isAndroid ? palette.accent : undefined}
      labelStyle={isAndroid ? { fontSize: 12 } : undefined}
    >
      <NativeTabs.Trigger name="(amy)" {...fallbackTabBar}>
        <Icon sf="calendar" androidSrc={<VectorIcon family={MaterialCommunityIcons} name="calendar" />} />
        <Label>{t('tabs.my')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(groups)" {...fallbackTabBar}>
        <Icon sf="person.3.fill" androidSrc={<VectorIcon family={MaterialIcons} name="groups" />} />
        <Label>{t('tabs.groups')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(employees)" {...fallbackTabBar}>
        <Icon sf="person.text.rectangle.fill" androidSrc={<VectorIcon family={MaterialIcons} name="person-search" />} />
        <Label>{t('tabs.employees')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(settings)" {...fallbackTabBar}>
        <Icon sf="gearshape.fill" androidSrc={<VectorIcon family={MaterialIcons} name="settings" />} />
        <Label>{t('tabs.settings')}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
