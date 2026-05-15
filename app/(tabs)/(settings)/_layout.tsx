import { StackActions } from '@react-navigation/native';
import { Stack, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback } from 'react';

import { usePalette } from '@hooks/usePalette';

export default function SettingsStackLayout() {
  const Palette = usePalette();
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      const tabState = navigation.getState();
      if (!tabState) return;
      const currentRoute = tabState.routes[tabState.index];
      const stackState = currentRoute?.state;
      if (stackState && (stackState.index ?? 0) > 0) {
        navigation.dispatch({
          ...StackActions.popToTop(),
          target: stackState.key,
        });
      }
    }, [navigation]),
  );

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Palette.background },
      }}
    />
  );
}
