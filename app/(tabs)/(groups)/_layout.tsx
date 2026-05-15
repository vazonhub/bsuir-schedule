import { StackActions } from '@react-navigation/native';
import { Stack, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback } from 'react';

import { usePalette } from '@hooks/usePalette';

/**
 * Stack for the Groups tab.
 * `index` = list of all student groups, `[name]` = schedule of a specific group.
 *
 * Headers are hidden globally — экраны рисуют свой UI «от края до края»; back
 * остаётся доступным через iOS swipe-back и системную Android-кнопку.
 */
export default function GroupsStackLayout() {
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
