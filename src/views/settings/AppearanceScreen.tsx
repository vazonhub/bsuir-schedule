import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Collapsible } from '@components/Collapsible';
import { ColorPalettePicker } from '@components/ColorPalettePicker';
import { GlassButton } from '@components/GlassButton';
import { IconGridPicker } from '@components/IconGridPicker';
import {
  BLOCK_ICON_CHOICES,
  CLOCK_ICON_CHOICES,
  EXAM_ICON_CHOICES,
  FAVORITES_ICON_CHOICES,
  LOCATION_ICON_CHOICES,
  SUBGROUP_ICON_CHOICES,
  TODAY_ICON_CHOICES,
} from '@constants/iconChoices';
import { ICON_COLOR_DEFAULTS, ICON_DEFAULTS } from '@hooks/useAppearance';
import { useIsDark, usePalette } from '@hooks/usePalette';
import type { KnownLessonType } from '@theme/colors';
import { FALLBACK_LESSON_COLOR, LESSON_TYPE_COLORS } from '@theme/colors';
import { usePreferencesStore } from '@stores/preferences.store';
import type { IconColorOverrides, IconOverrides, LessonColorOverrides } from '@stores/preferences.store';
import { Radius, Spacing, TAB_BAR_HEIGHT } from '@theme';

type PaletteType = ReturnType<typeof usePalette>;

/** Color entries in the picker. */
const COLOR_ENTRIES: { key: KnownLessonType; labelKey: string }[] = [
  { key: 'ЛР', labelKey: 'settings.colorLR' },
  { key: 'ПЗ', labelKey: 'settings.colorPZ' },
  { key: 'УПз', labelKey: 'settings.colorUPz' },
  { key: 'ЛК', labelKey: 'settings.colorLK' },
  { key: 'УЛк', labelKey: 'settings.colorULk' },
  { key: 'Консультация', labelKey: 'settings.colorConsultation' },
  { key: 'Экзамен', labelKey: 'settings.colorExam' },
];

/** Icon slots that also have a customizable color. */
const ICON_COLOR_SLOTS = new Set<string>(['exam', 'today']);

/** Icon entries in the picker. */
const ICON_ENTRIES: { slot: keyof IconOverrides; labelKey: string; choices: readonly string[] }[] = [
  { slot: 'exam', labelKey: 'settings.iconExam', choices: EXAM_ICON_CHOICES },
  { slot: 'today', labelKey: 'settings.iconToday', choices: TODAY_ICON_CHOICES },
  { slot: 'subgroup', labelKey: 'settings.iconSubgroup', choices: SUBGROUP_ICON_CHOICES },
  { slot: 'favorites', labelKey: 'settings.iconFavorites', choices: FAVORITES_ICON_CHOICES },
  { slot: 'location', labelKey: 'settings.iconLocation', choices: LOCATION_ICON_CHOICES },
  { slot: 'clock', labelKey: 'settings.iconClock', choices: CLOCK_ICON_CHOICES },
  { slot: 'block', labelKey: 'settings.iconBlock', choices: BLOCK_ICON_CHOICES },
];

/** Preview chips — short labels. */
const PREVIEW_TYPES: { type: KnownLessonType; label: string }[] = [
  { type: 'ЛР', label: 'ЛР' },
  { type: 'ПЗ', label: 'ПЗ' },
  { type: 'УПз', label: 'УПз' },
  { type: 'ЛК', label: 'ЛК' },
  { type: 'УЛк', label: 'УЛк' },
  { type: 'Консультация', label: 'Конс.' },
  { type: 'Экзамен', label: 'Экз.' },
];

const resolveColor = (type: KnownLessonType, overrides: LessonColorOverrides): string =>
  overrides[type] ?? LESSON_TYPE_COLORS[type] ?? FALLBACK_LESSON_COLOR;

const resolveIcon = (slot: keyof IconOverrides, overrides: IconOverrides): string =>
  overrides[slot] ?? ICON_DEFAULTS[slot];

const resolveIconColor = (slot: string, overrides: IconColorOverrides): string =>
  overrides[slot] ?? ICON_COLOR_DEFAULTS[slot] ?? '#999999';

export const AppearanceScreen = () => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const isDark = useIsDark();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);

  const committedColors = usePreferencesStore((s) => s.lessonColorOverrides);
  const committedIcons = usePreferencesStore((s) => s.iconOverrides);
  const committedIconColors = usePreferencesStore((s) => s.iconColorOverrides);

  const [draftColors, setDraftColors] = useState<LessonColorOverrides>({ ...committedColors });
  const [draftIcons, setDraftIcons] = useState<IconOverrides>({ ...committedIcons });
  const [draftIconColors, setDraftIconColors] = useState<IconColorOverrides>({ ...committedIconColors });

  const [expandedColor, setExpandedColor] = useState<KnownLessonType | null>(null);
  const [expandedIcon, setExpandedIcon] = useState<keyof IconOverrides | null>(null);
  const [previewIdx, setPreviewIdx] = useState(0);

  const current = PREVIEW_TYPES[previewIdx % PREVIEW_TYPES.length]!;

  const hasChanges = useMemo(() => {
    return JSON.stringify(draftColors) !== JSON.stringify(committedColors) ||
      JSON.stringify(draftIcons) !== JSON.stringify(committedIcons) ||
      JSON.stringify(draftIconColors) !== JSON.stringify(committedIconColors);
  }, [draftColors, draftIcons, draftIconColors, committedColors, committedIcons, committedIconColors]);

  const applyScale = useRef(new Animated.Value(1)).current;
  const scrollRef = useRef<ScrollView>(null);
  const rowYRef = useRef<Record<string, number>>({});

  const scrollToRow = useCallback((rowKey: string) => {
    setTimeout(() => {
      const y = rowYRef.current[rowKey];
      if (y !== undefined) {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
      }
    }, 250);
  }, []);

  const handleColorRowPress = useCallback((key: KnownLessonType) => {
    const isOpening = expandedColor !== key;
    setExpandedColor((prev) => (prev === key ? null : key));
    setExpandedIcon(null);
    if (isOpening) scrollToRow(`color-${key}`);
    const idx = PREVIEW_TYPES.findIndex((p) => p.type === key);
    if (idx >= 0) setPreviewIdx(idx);
  }, [expandedColor, scrollToRow]);

  const handleIconRowPress = useCallback((slot: keyof IconOverrides) => {
    const isOpening = expandedIcon !== slot;
    setExpandedIcon((prev) => (prev === slot ? null : slot));
    setExpandedColor(null);
    if (isOpening) scrollToRow(`icon-${slot}`);
  }, [expandedIcon, scrollToRow]);

  const handleDraftColor = useCallback((type: KnownLessonType, color: string) => {
    setDraftColors((prev) => {
      // If setting back to default, remove override entirely
      if (color === LESSON_TYPE_COLORS[type]) {
        const next = { ...prev };
        delete next[type];
        return next;
      }
      return { ...prev, [type]: color };
    });
  }, []);

  const handleDraftIcon = useCallback((slot: keyof IconOverrides, name: string) => {
    setDraftIcons((prev) => {
      if (name === ICON_DEFAULTS[slot]) {
        const next = { ...prev };
        delete next[slot];
        return next;
      }
      return { ...prev, [slot]: name };
    });
  }, []);

  const handleDraftIconColor = useCallback((slot: string, color: string) => {
    setDraftIconColors((prev) => {
      if (color === ICON_COLOR_DEFAULTS[slot]) {
        const next = { ...prev };
        delete next[slot];
        return next;
      }
      return { ...prev, [slot]: color };
    });
  }, []);

  const handleResetDraftColor = useCallback((type: KnownLessonType) => {
    setDraftColors((prev) => {
      const next = { ...prev };
      delete next[type];
      return next;
    });
  }, []);

  const handleResetDraftIcon = useCallback((slot: keyof IconOverrides) => {
    setDraftIcons((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
    setDraftIconColors((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
  }, []);

  /** Actually write draft to store. */
  const commitDraft = useCallback(() => {
    usePreferencesStore.setState({
      lessonColorOverrides: { ...draftColors },
      iconOverrides: { ...draftIcons },
      iconColorOverrides: { ...draftIconColors },
    });
    Animated.sequence([
      Animated.timing(applyScale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(applyScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  }, [draftColors, draftIcons, draftIconColors, applyScale]);

  /** Show reward-ad confirmation, then commit. */
  const applyChanges = useCallback(() => {
    Alert.alert(
      t('settings.appearanceApplyTitle'),
      t('settings.appearanceApplyMessage'),
      [
        {
          text: t('settings.appearanceApplyButton'),
          isPreferred: true,
          onPress: () => {
            // TODO: Show reward ad before committing.
            commitDraft();
          },
        },
        { text: t('common.cancel'), style: 'destructive' },
      ],
    );
  }, [t, commitDraft]);

  /** Back with unsaved-changes guard. */
  const handleBack = useCallback(() => {
    if (!hasChanges) {
      router.back();
      return;
    }
    Alert.alert(
      t('settings.unsavedTitle'),
      t('settings.unsavedMessageAd'),
      [
        {
          text: t('settings.unsavedSaveAd'),
          isPreferred: true,
          onPress: () => {
            // TODO: Show reward ad before committing.
            commitDraft();
            router.back();
          },
        },
        { text: t('settings.unsavedDiscard'), style: 'destructive', onPress: () => router.back() },
      ],
    );
  }, [hasChanges, t, router, commitDraft]);

  const handleReset = useCallback(() => {
    Alert.alert(
      t('settings.resetAppearance'),
      t('settings.resetAppearanceConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.resetAppearance'),
          style: 'destructive',
          onPress: () => {
            usePreferencesStore.getState().resetAllAppearance();
            setDraftColors({});
            setDraftIcons({});
            setDraftIconColors({});
          },
        },
      ],
    );
  }, [t]);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <GlassButton onPress={handleBack} size={38} accessibilityLabel={t('common.back')}>
          <Text style={styles.backChevron}>&#8249;</Text>
        </GlassButton>
        <Text style={styles.title} numberOfLines={1}>{t('settings.appearanceSection')}</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + TAB_BAR_HEIGHT + Spacing.md + (hasChanges ? 60 : 0) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Preview ── */}
        <Text style={styles.sectionTitle}>{t('settings.previewTitle')}</Text>
        <View style={styles.previewCard}>
          <View style={[styles.previewStripe, { backgroundColor: resolveColor(current.type, draftColors) }]} />
          <View style={styles.previewBody}>
            <Text style={styles.previewTime}>09:00–10:25</Text>
            <Text style={styles.previewSubject}>{t(`lessonType.${current.type}`)}</Text>
            <Text style={styles.previewMeta}>313-4к</Text>
          </View>
          <View style={styles.previewSubgroup}>
            <Ionicons
              name={resolveIcon('subgroup', draftIcons) as never}
              size={16}
              color={Palette.textSecondary}
            />
            <Text style={styles.previewSubgroupNum}>1</Text>
          </View>
        </View>

        <View style={styles.previewChips}>
          {PREVIEW_TYPES.map((entry, i) => {
            const color = resolveColor(entry.type, draftColors);
            const isActive = i === previewIdx;
            return (
              <Pressable
                key={entry.type}
                onPress={() => setPreviewIdx(i)}
                style={[styles.chip, { borderColor: color }, isActive && { backgroundColor: color }]}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{entry.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Colors ── */}
        <Text style={styles.sectionTitle}>{t('settings.lessonColors')}</Text>
        <View style={styles.card} onLayout={(e) => { rowYRef.current['_colorCard'] = e.nativeEvent.layout.y; }}>
          {COLOR_ENTRIES.map(({ key, labelKey }, i) => {
            const color = resolveColor(key, draftColors);
            const isExpanded = expandedColor === key;
            const isCustom = key in draftColors;
            return (
              <View key={key} onLayout={(e) => { rowYRef.current[`color-${key}`] = (rowYRef.current['_colorCard'] ?? 0) + e.nativeEvent.layout.y; }}>
                {i > 0 && <View style={styles.separator} />}
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  onPress={() => handleColorRowPress(key)}
                >
                  <View style={[styles.colorDot, { backgroundColor: color }]} />
                  <Text style={styles.rowLabel}>{t(labelKey)}</Text>
                  {isCustom && <Text style={styles.customBadge}>{t('settings.customBadge')}</Text>}
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={Palette.textTertiary}
                  />
                </Pressable>
                <Collapsible expanded={isExpanded}>
                  <View style={styles.pickerContainer}>
                    <ColorPalettePicker selected={color} defaultColor={LESSON_TYPE_COLORS[key]} onSelect={(c) => handleDraftColor(key, c)} />
                    <Collapsible expanded={isCustom} duration={200}>
                      <Pressable onPress={() => handleResetDraftColor(key)} style={styles.resetLink}>
                        <Text style={[styles.resetLinkText, { color: Palette.accent }]}>
                          {t('settings.resetToDefault')}
                        </Text>
                      </Pressable>
                    </Collapsible>
                  </View>
                </Collapsible>
              </View>
            );
          })}
        </View>

        {/* ── Icons ── */}
        <Text style={styles.sectionTitle}>{t('settings.icons')}</Text>
        <View style={styles.card} onLayout={(e) => { rowYRef.current['_iconCard'] = e.nativeEvent.layout.y; }}>
          {ICON_ENTRIES.map(({ slot, labelKey, choices }, i) => {
            const iconName = resolveIcon(slot, draftIcons);
            const hasColorSlot = ICON_COLOR_SLOTS.has(slot);
            const iconColor = hasColorSlot ? resolveIconColor(slot, draftIconColors) : Palette.textPrimary;
            const isExpanded = expandedIcon === slot;
            const isCustomIcon = iconName !== ICON_DEFAULTS[slot];
            const isCustomColor = hasColorSlot && draftIconColors[slot] !== undefined;
            const isCustom = isCustomIcon || isCustomColor;
            return (
              <View key={slot} onLayout={(e) => { rowYRef.current[`icon-${slot}`] = (rowYRef.current['_iconCard'] ?? 0) + e.nativeEvent.layout.y; }}>
                {i > 0 && <View style={styles.separator} />}
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  onPress={() => handleIconRowPress(slot)}
                >
                  <Ionicons name={iconName as never} size={20} color={iconColor} />
                  <Text style={styles.rowLabel}>{t(labelKey)}</Text>
                  {isCustom && <Text style={styles.customBadge}>{t('settings.customBadge')}</Text>}
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={Palette.textTertiary}
                  />
                </Pressable>
                <Collapsible expanded={isExpanded}>
                  <View style={styles.pickerContainer}>
                    <IconGridPicker
                      icons={choices}
                      selected={iconName}
                      color={hasColorSlot ? iconColor : Palette.accent}
                      onSelect={(name) => handleDraftIcon(slot, name)}
                    />
                    {hasColorSlot && (
                      <>
                        <Text style={styles.pickerSubtitle}>{t('settings.lessonColors')}</Text>
                        <ColorPalettePicker
                          selected={iconColor}
                          defaultColor={ICON_COLOR_DEFAULTS[slot]}
                          onSelect={(c) => handleDraftIconColor(slot, c)}
                        />
                      </>
                    )}
                    <Collapsible expanded={isCustom} duration={200}>
                      <Pressable onPress={() => handleResetDraftIcon(slot)} style={styles.resetLink}>
                        <Text style={[styles.resetLinkText, { color: Palette.accent }]}>
                          {t('settings.resetToDefault')}
                        </Text>
                      </Pressable>
                    </Collapsible>
                  </View>
                </Collapsible>
              </View>
            );
          })}
        </View>

        {/* ── Reset ── */}
        <Pressable
          style={({ pressed }) => [styles.resetButton, pressed && styles.rowPressed]}
          onPress={handleReset}
        >
          <Text style={[styles.resetButtonText, { color: Palette.destructive }]}>
            {t('settings.resetAppearance')}
          </Text>
        </Pressable>

      </ScrollView>

      {hasChanges && (
        <Animated.View
          style={[
            styles.applyWrap,
            { bottom: insets.bottom + TAB_BAR_HEIGHT + Spacing.md, transform: [{ scale: applyScale }] },
          ]}
        >
          <Pressable
            onPress={applyChanges}
            style={({ pressed }) => [styles.applyButton, pressed && styles.applyButtonPressed]}
          >
            {Platform.OS === 'ios' ? (
              <BlurView
                intensity={120}
                tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterial'}
                style={StyleSheet.absoluteFill}
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' }]} />
            )}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Palette.accent + '30' }]} />
            <View style={styles.applyContent}>
              <Ionicons name="videocam" size={18} color={Palette.accent} />
              <Text style={[styles.applyButtonText, { color: Palette.accent }]}>{t('settings.applyChanges')}</Text>
            </View>
          </Pressable>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const makeStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: Palette.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.screenPadding,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.md,
      gap: Spacing.md,
    },
    backChevron: { fontSize: 28, lineHeight: 28, fontWeight: '500', color: Palette.textPrimary },
    title: { flex: 1, fontSize: 22, fontWeight: '700', color: Palette.textPrimary },
    scroll: { paddingHorizontal: Spacing.screenPadding },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: Palette.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: Spacing.xl,
      marginBottom: Spacing.sm,
      paddingHorizontal: Spacing.xs,
    },

    /* Preview */
    previewCard: {
      flexDirection: 'row',
      backgroundColor: Palette.card,
      borderRadius: Radius.lg,
      overflow: 'hidden',
    },
    previewStripe: { width: 5 },
    previewBody: { flex: 1, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, gap: 2 },
    previewTime: { fontSize: 13, fontWeight: '600', color: Palette.textPrimary },
    previewSubject: { fontSize: 16, fontWeight: '600', color: Palette.textPrimary },
    previewMeta: { fontSize: 13, color: Palette.textSecondary },
    previewSubgroup: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingRight: Spacing.lg },
    previewSubgroupNum: { fontSize: 16, fontWeight: '600', color: Palette.textSecondary },
    previewChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
    chip: { paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: Radius.pill, borderWidth: 1.5 },
    chipText: { fontSize: 12, fontWeight: '600', color: Palette.textPrimary },
    chipTextActive: { color: '#FFFFFF' },

    /* Card */
    card: { backgroundColor: Palette.card, borderRadius: Radius.lg, overflow: 'hidden' },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: Palette.separator, marginLeft: Spacing.cardPaddingX },

    /* Rows */
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.cardPaddingX,
      paddingVertical: Spacing.cardPaddingY,
      gap: Spacing.lg,
    },
    rowPressed: { backgroundColor: Palette.cardPressed },
    colorDot: { width: 24, height: 24, borderRadius: 12 },
    rowLabel: { flex: 1, fontSize: 16, color: Palette.textPrimary },
    customBadge: { fontSize: 11, fontWeight: '600', color: Palette.accent, textTransform: 'uppercase' },

    /* Picker */
    pickerContainer: { paddingHorizontal: Spacing.cardPaddingX, paddingBottom: Spacing.md },
    pickerSubtitle: {
      fontSize: 12,
      fontWeight: '600',
      color: Palette.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      marginTop: Spacing.md,
      marginBottom: Spacing.xs,
    },
    resetLink: { paddingVertical: Spacing.xs },
    resetLinkText: { fontSize: 14, fontWeight: '500' },

    /* Apply (absolute) */
    applyWrap: {
      position: 'absolute',
      left: Spacing.screenPadding,
      right: Spacing.screenPadding,
    },
    applyButton: {
      height: 48,
      borderRadius: Radius.lg,
      overflow: 'hidden',
    },
    applyButtonPressed: { opacity: 0.8 },
    applyContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
    },
    applyButtonText: { fontSize: 16, fontWeight: '600' },

    /* Reset */
    resetButton: {
      alignItems: 'center',
      paddingVertical: Spacing.cardPaddingY,
      marginTop: Spacing.lg,
      backgroundColor: Palette.card,
      borderRadius: Radius.lg,
    },
    resetButtonText: { fontSize: 16, fontWeight: '500' },
  });
