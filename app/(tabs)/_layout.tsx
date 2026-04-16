import { useTranslation } from 'react-i18next';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';

/**
 * Native tab bar (UITabBarController on iOS, BottomNavigationView on Android).
 * On iOS 26+ автоматически рендерится с новым Liquid Glass.
 *
 * `minimizeBehavior="never"` — таббар не сворачивается при скролле вниз
 * (на iOS 26+ дефолтное поведение `automatic` сворачивает его в pill).
 */
export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <NativeTabs minimizeBehavior="never">
      <NativeTabs.Trigger name="(my)">
        <Icon sf="calendar" />
        <Label>{t('tabs.my')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(groups)">
        <Icon sf="person.3.fill" />
        <Label>{t('tabs.groups')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(employees)">
        <Icon sf="person.text.rectangle.fill" />
        <Label>{t('tabs.employees')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(settings)">
        <Icon sf="gearshape.fill" />
        <Label>{t('tabs.settings')}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
