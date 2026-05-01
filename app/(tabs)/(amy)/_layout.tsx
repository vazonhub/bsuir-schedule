import { Stack } from 'expo-router';

import { usePalette } from '@hooks/usePalette';

/**
 * Stack for the "My Schedule" tab.
 * `index` = pinned group schedule or empty state.
 * `pick-group` = group picker to set/change the default group.
 */
export default function MyStackLayout() {
  const Palette = usePalette();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Palette.background },
      }}
    />
  );
}
