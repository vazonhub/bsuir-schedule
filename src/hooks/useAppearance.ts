import { useCallback } from 'react';

import { usePreferencesStore } from '@stores/preferences.store';
import { FALLBACK_LESSON_COLOR, LESSON_TYPE_COLORS } from '@theme/colors';
import type { KnownLessonType } from '@theme/colors';
import type { LessonTypeAbbrev } from '@models/dto';
import type { IconOverrides } from '@stores/preferences.store';

const ICON_DEFAULTS: Required<IconOverrides> = {
  exam: 'school',
  today: 'time',
  subgroup: 'person',
  favorites: 'star',
  location: 'location-outline',
  clock: 'time-outline',
  block: 'ban',
};

/**
 * Returns a function that resolves lesson type → accent color,
 * respecting user overrides from the preferences store.
 */
export const useGetLessonAccentColor = () => {
  const overrides = usePreferencesStore((s) => s.lessonColorOverrides);
  return useCallback(
    (type: LessonTypeAbbrev | null | undefined): string => {
      if (!type) return FALLBACK_LESSON_COLOR;
      const override = overrides[type as KnownLessonType];
      if (override) return override;
      return LESSON_TYPE_COLORS[type as KnownLessonType] ?? FALLBACK_LESSON_COLOR;
    },
    [overrides],
  );
};

/** Returns the current icon name for a given customizable slot. */
export const useIconName = (slot: keyof IconOverrides): string => {
  const overrides = usePreferencesStore((s) => s.iconOverrides);
  return overrides[slot] ?? ICON_DEFAULTS[slot];
};

/** Default colors for icon slots that have customizable colors. */
const ICON_COLOR_DEFAULTS: Record<string, string> = {
  exam: '#FF9500',
  today: '#34C759',
};

/** Returns the current color for a given icon slot. */
export const useIconColor = (slot: string): string => {
  const overrides = usePreferencesStore((s) => s.iconColorOverrides);
  return overrides[slot] ?? ICON_COLOR_DEFAULTS[slot] ?? '#999999';
};

export { ICON_DEFAULTS, ICON_COLOR_DEFAULTS };
