import { StackActions } from '@react-navigation/native';
import { Stack, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback } from 'react';

import { usePalette } from '@hooks/usePalette';

/**
 * Stack for the Employees tab.
 * `index` = list of all teachers, `[urlId]` = schedule of a specific teacher.
 *
 * Headers are hidden globally — см. комментарий в (groups)/_layout.tsx.
 */
export default function EmployeesStackLayout() {
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
