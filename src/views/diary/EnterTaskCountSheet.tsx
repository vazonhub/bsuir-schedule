import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { useIsDark, usePalette } from '@hooks/usePalette';
import { Radius, Spacing } from '@theme';
import { textProps } from '@theme/typography';

type PaletteType = ReturnType<typeof usePalette>;

interface Payload {
  subject: string;
  subjectFullName: string;
  initial: number | null;
}

export interface EnterTaskCountSheetRef {
  present(payload: Payload): void;
  dismiss(): void;
}

interface Props {
  onSubmit(subject: string, count: number): void;
}

const MIN = 1;
const MAX = 99;
const EMPTY_ACCESSORY_ID = 'diary-enter-count-empty-accessory';

/**
 * Bottom-sheet with a numeric input to enter (or edit) the number of tasks
 * for a subject. Parent presents it via ref and gets the final count via
 * `onSubmit` — the sheet doesn't touch the store directly.
 */
export const EnterTaskCountSheet = forwardRef<EnterTaskCountSheetRef, Props>(
  ({ onSubmit }, ref) => {
    const { t } = useTranslation();
    const Palette = usePalette();
    const isDark = useIsDark();
    const styles = useMemo(() => makeStyles(Palette), [Palette]);
    const sheetRef = useRef<BottomSheetModal>(null);
    const inputRef = useRef<TextInput>(null);
    const [payload, setPayload] = useState<Payload | null>(null);
    const [text, setText] = useState<string>('');
    const snapPoints = useMemo(() => ['30%'], []);

    useImperativeHandle(ref, () => ({
      present: (p) => {
        setPayload(p);
        setText(p.initial != null ? String(p.initial) : '');
        sheetRef.current?.present();
      },
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    // Autofocus input shortly after the sheet opens.
    useEffect(() => {
      if (!payload) return;
      const timer = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(timer);
    }, [payload]);

    const parsed = useMemo(() => {
      const n = parseInt(text, 10);
      if (Number.isNaN(n)) return null;
      if (n < MIN || n > MAX) return null;
      return n;
    }, [text]);

    const handleSave = useCallback(() => {
      if (!payload || parsed == null) return;
      onSubmit(payload.subject, parsed);
      Keyboard.dismiss();
      sheetRef.current?.dismiss();
    }, [payload, parsed, onSubmit]);

    const handleChange = useCallback((raw: string) => {
      // Digits only, ≤ 2 chars.
      const digits = raw.replace(/[^0-9]/g, '').slice(0, 2);
      setText(digits);
    }, []);

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        keyboardBehavior="interactive"
        android_keyboardInputMode="adjustResize"
        backgroundStyle={{ backgroundColor: Palette.card }}
        handleIndicatorStyle={{ backgroundColor: Palette.textTertiary }}
        onDismiss={() => {
          setPayload(null);
          setText('');
        }}
      >
        <BottomSheetView style={styles.content}>
          <Text {...textProps('title')} style={styles.title}>
            {t('diary.enterTaskCountTitle')}
          </Text>
          {payload && (
            <Text {...textProps('subhead')} style={styles.subtitle} numberOfLines={2}>
              {payload.subjectFullName}
            </Text>
          )}

          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={handleChange}
            onSubmitEditing={handleSave}
            keyboardType="number-pad"
            keyboardAppearance={isDark ? 'dark' : 'light'}
            placeholder="10"
            placeholderTextColor={Palette.searchPlaceholder}
            maxLength={2}
            style={styles.input}
            selectionColor={Palette.accent}
            inputAccessoryViewID={Platform.OS === 'ios' ? EMPTY_ACCESSORY_ID : undefined}
          />
          {Platform.OS === 'ios' && (
            <InputAccessoryView nativeID={EMPTY_ACCESSORY_ID}>
              <View />
            </InputAccessoryView>
          )}

          <Text {...textProps('footnote')} style={styles.hint}>
            {t('diary.enterTaskCountHint', { min: MIN, max: MAX })}
          </Text>

          <Pressable
            onPress={handleSave}
            disabled={parsed == null}
            style={({ pressed }) => [
              styles.saveBtn,
              parsed == null && styles.saveBtnDisabled,
              pressed && parsed != null && styles.saveBtnPressed,
            ]}
          >
            <Text {...textProps('body')} style={styles.saveBtnLabel}>
              {t('common.save')}
            </Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);
EnterTaskCountSheet.displayName = 'EnterTaskCountSheet';

const makeStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    content: {
      flex: 1,
      paddingHorizontal: Spacing.xxl,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.xl,
      gap: Spacing.md,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: Palette.textPrimary,
    },
    subtitle: {
      color: Palette.textSecondary,
      marginTop: -Spacing.xs,
    },
    input: {
      alignSelf: 'center',
      minWidth: 100,
      textAlign: 'center',
      fontSize: 32,
      fontWeight: '700',
      color: Palette.textPrimary,
      borderRadius: Radius.md,
      backgroundColor: Palette.background,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      marginTop: Spacing.xs,
    },
    hint: {
      color: Palette.textTertiary,
      textAlign: 'center',
    },
    saveBtn: {
      marginTop: Spacing.xs,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.md,
      borderRadius: Radius.md,
      backgroundColor: Palette.accent,
    },
    saveBtnDisabled: { opacity: 0.4 },
    saveBtnPressed: { opacity: 0.7 },
    saveBtnLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  });
