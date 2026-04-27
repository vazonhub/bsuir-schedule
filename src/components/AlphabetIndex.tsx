import { BlurView } from 'expo-blur';
import { useCallback, useMemo, useRef } from 'react';
import { GestureResponderEvent, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useIsScreenReader } from '@hooks/useAccessibility';
import { usePalette } from '@hooks/usePalette';
import { Radius } from '@theme';

type PaletteType = ReturnType<typeof usePalette>;

interface Props {
  letters: string[];
  onSelect(letter: string): void;
  /** The letter currently visible on screen — rendered as a dot. */
  activeLetter?: string | null;
  /** Resolved color scheme for BlurView tint. */
  scheme?: 'light' | 'dark';
}

/**
 * Vertical alphabet strip on the right edge (iOS Contacts style).
 * Supports both tap and pan gesture. The currently visible letter
 * is shown as a bullet dot (•) instead of the letter.
 */
export const AlphabetIndex = ({ letters, onSelect, activeLetter, scheme = 'light' }: Props) => {
  const { t } = useTranslation();
  const isScreenReader = useIsScreenReader();
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  const innerRef = useRef<View>(null);
  const layoutRef = useRef({ y: 0, height: 0 });
  const lastLetterRef = useRef<string | null>(null);

  const selectFromPageY = useCallback(
    (pageY: number) => {
      const { y, height } = layoutRef.current;
      if (height === 0 || letters.length === 0) return;
      const relY = pageY - y;
      const idx = Math.min(
        Math.max(Math.floor((relY / height) * letters.length), 0),
        letters.length - 1,
      );
      const letter = letters[idx];
      if (letter && letter !== lastLetterRef.current) {
        lastLetterRef.current = letter;
        onSelect(letter);
      }
    },
    [letters, onSelect],
  );

  const handleTouchStart = useCallback(
    (e: GestureResponderEvent) => {
      lastLetterRef.current = null;
      // Measure the inner strip (not the full-height container).
      innerRef.current?.measureInWindow((_x, y, _w, h) => {
        layoutRef.current = { y, height: h };
        selectFromPageY(e.nativeEvent.pageY);
      });
    },
    [selectFromPageY],
  );

  const handleTouchMove = useCallback(
    (e: GestureResponderEvent) => {
      selectFromPageY(e.nativeEvent.pageY);
    },
    [selectFromPageY],
  );

  if (letters.length === 0) return null;

  // When VoiceOver/TalkBack is active, render accessible Pressable buttons
  // instead of the gesture-based strip.
  if (isScreenReader) {
    const accessibleInner = (
      <View ref={innerRef} style={styles.inner} collapsable={false}>
        {letters.map((l) => (
          <Pressable
            key={l}
            onPress={() => onSelect(l)}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.alphabetJumpTo', { letter: l })}
          >
            <Text maxFontSizeMultiplier={1}style={[styles.letter, l === activeLetter && styles.letterActive]}>
              {l === activeLetter ? '•' : l}
            </Text>
          </Pressable>
        ))}
      </View>
    );

    return (
      <View style={styles.container}>
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={40}
            tint={scheme === 'dark' ? 'dark' : 'light'}
            style={styles.blur}
          >
            {accessibleInner}
          </BlurView>
        ) : (
          <View style={styles.androidBg}>{accessibleInner}</View>
        )}
      </View>
    );
  }

  const inner = (
    <View ref={innerRef} style={styles.inner} collapsable={false}>
      {letters.map((l) => {
        const isActive = l === activeLetter;
        return (
          <Text
            key={l}
            maxFontSizeMultiplier={1}
            style={[styles.letter, isActive && styles.letterActive]}
            accessible={true}
            accessibilityLabel={t('a11y.alphabetJumpTo', { letter: l })}
          >
            {isActive ? '•' : l}
          </Text>
        );
      })}
    </View>
  );

  return (
    <View
      style={styles.container}
      pointerEvents="box-only"
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderStart={handleTouchStart}
      onResponderMove={handleTouchMove}
    >
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={40}
          tint={scheme === 'dark' ? 'dark' : 'light'}
          style={styles.blur}
        >
          {inner}
        </BlurView>
      ) : (
        <View style={styles.androidBg}>{inner}</View>
      )}
    </View>
  );
};

const makeStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      right: 2,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      zIndex: 10,
    },
    blur: {
      borderRadius: Radius.md,
      overflow: 'hidden',
    },
    androidBg: {
      borderRadius: Radius.md,
      backgroundColor: Palette.background + 'CC',
    },
    inner: {
      paddingVertical: 4,
      paddingHorizontal: 5,
      alignItems: 'center',
    },
    letter: {
      fontSize: 11,
      fontWeight: '600',
      color: Palette.accent,
      lineHeight: 16,
      textAlign: 'center',
      width: 12,
    },
    letterActive: {
      fontSize: 9,
      color: Palette.textTertiary,
    },
  });
