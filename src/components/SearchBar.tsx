import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { usePalette } from '@hooks/usePalette';
import { Radius, Spacing } from '@theme';

type PaletteType = ReturnType<typeof usePalette>;

interface Props {
  value: string;
  onChange(value: string): void;
  placeholder?: string;
}

/**
 * Search bar styled as a card-tile (matches the rest of the design system —
 * white fill, large corner radius, screen-edge padding).
 */
export const SearchBar = ({ value, onChange, placeholder }: Props) => {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t('common.search');
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  const showClear = value.length > 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Text maxFontSizeMultiplier={1}style={styles.icon} importantForAccessibility="no">{'\u2315'}</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder={resolvedPlaceholder}
          placeholderTextColor={Palette.searchPlaceholder}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          underlineColorAndroid="transparent"
          maxFontSizeMultiplier={1.5}
          accessibilityLabel={t('common.search')}
        />
        {showClear && (
          <Pressable
            onPress={() => onChange('')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('common.clear')}
            accessibilityHint={t('a11y.clearSearch')}
          >
            <Text maxFontSizeMultiplier={1}style={styles.clear}>{'\u00D7'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const makeStyles = (Palette: PaletteType) => StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.cardGap,
    backgroundColor: Palette.background,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    minHeight: 44,
  },
  icon: {
    fontSize: 18,
    color: Palette.textTertiary,
    marginRight: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Palette.textPrimary,
    paddingVertical: 0,
  },
  clear: {
    fontSize: 22,
    lineHeight: 22,
    color: Palette.textTertiary,
    paddingHorizontal: Spacing.xs,
  },
});
