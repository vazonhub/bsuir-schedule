import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Markdown, { MarkdownIt } from 'react-native-markdown-display';

import { FireController } from '@controllers/fire.controller';
import { useIsDark, usePalette } from '@hooks/usePalette';
import { useDiaryStore } from '@stores/diary.store';
import type { DiaryTaskType } from '@stores/diary.store';
import { Radius, Spacing } from '@theme';
import { LESSON_TYPE_COLORS } from '@theme/colors';
import { textProps } from '@theme/typography';
import { hapticLight } from '@utils/haptics';
import { pickFileForNote, pickImageForNote } from '@utils/noteAttachments';

type PaletteType = ReturnType<typeof usePalette>;

/**
 * Markdown renderer with autolinking on: a bare pasted URL (not just the
 * `[text](url)` form) becomes a tappable link. `typographer` matches the
 * library's default instance.
 */
const markdownItInstance = MarkdownIt({ typographer: true, linkify: true });

/**
 * Allow the `file:` scheme so attachments (images/files picked from the device
 * and copied under `documentDirectory`) tokenize into image/link nodes instead
 * of staying as raw `![](file://…)` text. Keeps markdown-it's other guards
 * (`javascript:`/`vbscript:`, non-image `data:`).
 */
markdownItInstance.validateLink = (url: string) => {
  const str = url.trim().toLowerCase();
  if (str.startsWith('file:')) return true;
  return /^(vbscript|javascript|data):/.test(str)
    ? /^data:image\/(gif|png|jpeg|webp);/.test(str)
    : true;
};

interface Payload {
  subject: string;
  subjectFullName: string;
  type: DiaryTaskType;
  index: number;
}

export interface NoteSheetRef {
  present(payload: Payload): void;
  dismiss(): void;
}

interface Props {
  groupName: string;
}

/**
 * View / edit the markdown note attached to a single task (subject + type +
 * index). Supports links, images and file attachments picked from the device.
 */
export const NoteSheet = forwardRef<NoteSheetRef, Props>(({ groupName }, ref) => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const isDark = useIsDark();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  const mdStyles = useMemo(() => makeMarkdownStyles(Palette), [Palette]);
  const setTaskNote = useDiaryStore((s) => s.setTaskNote);
  const toggleTask = useDiaryStore((s) => s.toggleTask);

  const sheetRef = useRef<BottomSheetModal>(null);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [text, setText] = useState('');
  const [editing, setEditing] = useState(false);
  const [done, setDone] = useState(false);
  const snapPoints = useMemo(() => ['92%'], []);

  const save = useCallback(
    (value: string) => {
      if (!payload) return;
      setTaskNote(groupName, payload.subject, payload.type, payload.index, value);
    },
    [payload, groupName, setTaskNote],
  );

  useImperativeHandle(ref, () => ({
    present: (p) => {
      const entry = useDiaryStore.getState().progress[groupName]?.[p.subject]?.[p.type];
      const note = entry?.notes?.[p.index] ?? '';
      setPayload(p);
      setText(note);
      setDone(entry?.completed.includes(p.index) ?? false);
      setEditing(note.trim().length === 0); // new note → open straight into edit
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleDone = useCallback(() => {
    save(text);
    setEditing(false);
  }, [save, text]);

  const handleToggleDone = useCallback(() => {
    if (!payload) return;
    void hapticLight();
    toggleTask(groupName, payload.subject, payload.type, payload.index);
    setDone((prev) => {
      // Marking done = activity for the fire streak (un-checking is not).
      if (!prev) FireController.registerHomework();
      return !prev;
    });
  }, [payload, groupName, toggleTask]);

  const handleAttach = useCallback(
    async (kind: 'image' | 'file') => {
      try {
        const snippet = kind === 'image' ? await pickImageForNote() : await pickFileForNote();
        if (!snippet) return;
        void hapticLight();
        setText((prev) => (prev.trim().length > 0 ? `${prev}\n\n${snippet}\n` : `${snippet}\n`));
      } catch {
        Alert.alert(t('diary.noteAttachError'));
      }
    },
    [t],
  );

  const accent = payload ? LESSON_TYPE_COLORS[payload.type] : Palette.accent;

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
      onDismiss={() => {
        save(text);
        setPayload(null);
        setText('');
        setEditing(false);
      }}
    >
      {payload && (
        <View style={styles.flex}>
          <View style={styles.header}>
            <View style={styles.headerInfo}>
              <View style={styles.titleRow}>
                <View style={[styles.typeTag, { backgroundColor: accent + '1F' }]}>
                  <Text {...textProps('subhead')} style={[styles.typeTagLabel, { color: accent }]}>
                    {payload.type} №{payload.index}
                  </Text>
                </View>
                <Text {...textProps('title')} style={styles.title} numberOfLines={1}>
                  {payload.subject}
                </Text>
              </View>
              <Text {...textProps('footnote')} style={styles.subtitle} numberOfLines={1}>
                {payload.subjectFullName}
              </Text>
            </View>
            <Pressable
              onPress={() => (editing ? handleDone() : setEditing(true))}
              hitSlop={8}
              style={styles.headerBtn}
            >
              <Text {...textProps('body')} style={styles.headerBtnLabel}>
                {editing ? t('common.done') : t('common.edit')}
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={handleToggleDone}
            style={({ pressed }) => [
              styles.doneToggle,
              done && styles.doneToggleActive,
              pressed && styles.doneTogglePressed,
            ]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: done }}
          >
            <Ionicons
              name={done ? 'checkmark-circle' : 'ellipse-outline'}
              size={20}
              color={done ? DONE_ACCENT : Palette.textTertiary}
            />
            <Text
              {...textProps('body')}
              style={[styles.doneToggleLabel, done && styles.doneToggleLabelActive]}
            >
              {t('diary.taskDone')}
            </Text>
          </Pressable>

          {editing ? (
            <View style={styles.flex}>
              <View style={styles.toolbar}>
                <ToolbarButton
                  icon="image-outline"
                  label={t('diary.noteAttachImage')}
                  onPress={() => void handleAttach('image')}
                  Palette={Palette}
                />
                <ToolbarButton
                  icon="document-attach-outline"
                  label={t('diary.noteAttachFile')}
                  onPress={() => void handleAttach('file')}
                  Palette={Palette}
                />
              </View>
              <BottomSheetTextInput
                value={text}
                onChangeText={setText}
                multiline
                autoFocus
                placeholder={t('diary.notePlaceholder')}
                placeholderTextColor={Palette.searchPlaceholder}
                keyboardAppearance={isDark ? 'dark' : 'light'}
                style={styles.input}
                textAlignVertical="top"
              />
            </View>
          ) : (
            <BottomSheetScrollView contentContainerStyle={styles.viewerContent}>
              {text.trim().length === 0 ? (
                <Text {...textProps('callout')} style={styles.empty}>
                  {t('diary.noteEmpty')}
                </Text>
              ) : (
                <Markdown
                  markdownit={markdownItInstance}
                  style={mdStyles}
                  onLinkPress={(url) => {
                    void Linking.openURL(url).catch(() => {
                      Alert.alert(t('diary.noteOpenLinkError'));
                    });
                    return false;
                  }}
                  rules={{
                    image: (node) => (
                      <Image
                        key={node.key}
                        source={{ uri: node.attributes.src }}
                        style={styles.mdImage}
                        contentFit="cover"
                        transition={120}
                      />
                    ),
                  }}
                >
                  {text}
                </Markdown>
              )}
            </BottomSheetScrollView>
          )}
        </View>
      )}
    </BottomSheetModal>
  );
});

NoteSheet.displayName = 'NoteSheet';

const ToolbarButton = ({
  icon,
  label,
  onPress,
  Palette,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress(): void;
  Palette: PaletteType;
}) => {
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.toolbarBtn, pressed && styles.toolbarBtnPressed]}
    >
      <Ionicons name={icon} size={18} color={Palette.accent} />
      <Text {...textProps('footnote')} style={styles.toolbarBtnLabel}>
        {label}
      </Text>
    </Pressable>
  );
};

const DONE_ACCENT = '#3FB36F';

const makeStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    flex: { flex: 1 },
    background: { backgroundColor: Palette.card, borderRadius: Radius.xl },
    handle: { backgroundColor: Palette.textTertiary, width: 36 },
    doneToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginHorizontal: Spacing.xl,
      marginBottom: Spacing.md,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderRadius: Radius.md,
      backgroundColor: Palette.background,
    },
    doneToggleActive: { backgroundColor: DONE_ACCENT + '1F' },
    doneTogglePressed: { opacity: 0.7 },
    doneToggleLabel: { color: Palette.textSecondary, fontWeight: '600' },
    doneToggleLabelActive: { color: DONE_ACCENT },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.md,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.md,
    },
    headerInfo: { flex: 1, gap: 2 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    typeTag: {
      paddingHorizontal: Spacing.md,
      paddingVertical: 2,
      borderRadius: Radius.pill,
    },
    typeTagLabel: { fontSize: 12, fontWeight: '700' },
    title: { flex: 1, fontSize: 18, fontWeight: '700', color: Palette.textPrimary },
    subtitle: { color: Palette.textSecondary },
    headerBtn: { paddingVertical: 2 },
    headerBtnLabel: { color: Palette.accent, fontSize: 16, fontWeight: '600' },
    toolbar: {
      flexDirection: 'row',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.xl,
      paddingBottom: Spacing.sm,
    },
    toolbarBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.pill,
      backgroundColor: Palette.background,
    },
    toolbarBtnPressed: { backgroundColor: Palette.cardPressed },
    toolbarBtnLabel: { color: Palette.accent, fontWeight: '600' },
    input: {
      flex: 1,
      marginHorizontal: Spacing.xl,
      marginBottom: Spacing.xl,
      padding: Spacing.lg,
      borderRadius: Radius.lg,
      backgroundColor: Palette.background,
      color: Palette.textPrimary,
      fontSize: 16,
      lineHeight: 22,
    },
    viewerContent: {
      paddingHorizontal: Spacing.xl,
      paddingBottom: Spacing.xxxl + 40,
    },
    empty: { color: Palette.textTertiary, textAlign: 'center', paddingVertical: Spacing.xxxl },
    mdImage: {
      width: '100%',
      height: 220,
      borderRadius: Radius.md,
      marginVertical: Spacing.sm,
    },
  });

/** Markdown element styles keyed by the react-native-markdown-display element names. */
const makeMarkdownStyles = (Palette: PaletteType) => ({
  body: { color: Palette.textPrimary, fontSize: 16, lineHeight: 23 },
  heading1: { color: Palette.textPrimary, fontWeight: '700' as const, fontSize: 22 },
  heading2: { color: Palette.textPrimary, fontWeight: '700' as const, fontSize: 19 },
  heading3: { color: Palette.textPrimary, fontWeight: '700' as const, fontSize: 17 },
  link: { color: Palette.accent },
  blockquote: {
    backgroundColor: Palette.background,
    borderColor: Palette.separator,
    borderLeftWidth: 3,
    paddingHorizontal: Spacing.md,
  },
  code_inline: {
    backgroundColor: Palette.background,
    color: Palette.textPrimary,
    borderRadius: Radius.sm,
  },
  fence: {
    backgroundColor: Palette.background,
    color: Palette.textPrimary,
    borderColor: Palette.separator,
    borderRadius: Radius.md,
  },
  code_block: {
    backgroundColor: Palette.background,
    color: Palette.textPrimary,
    borderColor: Palette.separator,
    borderRadius: Radius.md,
  },
  hr: { backgroundColor: Palette.separator },
});
