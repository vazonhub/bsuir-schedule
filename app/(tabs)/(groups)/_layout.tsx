import { Stack } from 'expo-router';

/**
 * Stack for the Groups tab.
 * `index` = list of all student groups, `[name]` = schedule of a specific group.
 *
 * Headers are hidden globally — экраны рисуют свой UI «от края до края»; back
 * остаётся доступным через iOS swipe-back и системную Android-кнопку.
 */
export default function GroupsStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
