import { Stack } from 'expo-router';

import { usePalette } from '@hooks/usePalette';

export default function SettingsStackLayout() {
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
