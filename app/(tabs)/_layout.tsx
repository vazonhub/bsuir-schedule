import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';

/**
 * Native tab bar (UITabBarController on iOS, BottomNavigationView on Android).
 * On iOS 26+ автоматически рендерится с новым Liquid Glass.
 *
 * `minimizeBehavior="never"` — таббар не сворачивается при скролле вниз
 * (на iOS 26+ дефолтное поведение `automatic` сворачивает его в pill).
 */
export default function TabsLayout() {
  return (
    <NativeTabs minimizeBehavior="never">
      <NativeTabs.Trigger name="(groups)">
        <Icon sf="person.3.fill" />
        <Label>Группы</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(employees)">
        <Icon sf="graduationcap.fill" />
        <Label>Преподаватели</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
