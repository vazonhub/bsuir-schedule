import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassButton } from '@components/GlassButton';
import { usePalette } from '@hooks/usePalette';
import type { Holiday } from '@models/holiday';
import { useHolidaysStore } from '@stores/holidays.store';
import { Radius, Spacing, TAB_BAR_HEIGHT } from '@theme';
import { toDateISO } from '@utils/holidays';

type PaletteType = ReturnType<typeof usePalette>;

const MONTHS_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

const formatHolidayDate = (dateISO: string): string => {
  const [, m, d] = dateISO.split('-');
  if (!m || !d) return dateISO;
  const month = parseInt(m, 10) - 1;
  const day = parseInt(d, 10);
  return `${day} ${MONTHS_RU[month] ?? m}`;
};

/**
 * Build a flat list of all holidays (API + user-added), sorted by date.
 * Each entry carries an `isHidden` / `isUserAdded` flag for rendering.
 */
interface DisplayHoliday extends Holiday {
  isHidden: boolean;
  isUserAdded: boolean;
}

const buildDisplayList = (
  apiHolidays: Holiday[],
  userAdded: Record<string, string>,
  userRemoved: Record<string, boolean>,
): DisplayHoliday[] => {
  const fromApi: DisplayHoliday[] = apiHolidays.map((h) => ({
    ...h,
    isHidden: !!userRemoved[h.date],
    isUserAdded: false,
  }));
  const fromUser: DisplayHoliday[] = Object.entries(userAdded).map(([date, name]) => ({
    date,
    name,
    isHidden: false,
    isUserAdded: true,
  }));
  return [...fromApi, ...fromUser].sort((a, b) => a.date.localeCompare(b.date));
};

export const HolidaysScreen = () => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);

  const year = new Date().getFullYear();
  const apiHolidays = useHolidaysStore((s) => s.byYear[String(year)] ?? []);
  const userAdded = useHolidaysStore((s) => s.userAdded);
  const userRemoved = useHolidaysStore((s) => s.userRemoved);
  const addUserHoliday = useHolidaysStore((s) => s.addUserHoliday);
  const removeUserHoliday = useHolidaysStore((s) => s.removeUserHoliday);
  const restoreHoliday = useHolidaysStore((s) => s.restoreHoliday);
  const resetUserOverrides = useHolidaysStore((s) => s.resetUserOverrides);

  const holidays = useMemo(
    () => buildDisplayList(apiHolidays, userAdded, userRemoved),
    [apiHolidays, userAdded, userRemoved],
  );

  const hasOverrides = Object.keys(userAdded).length > 0 || Object.keys(userRemoved).length > 0;

  // ── Add holiday modal ──
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios');

  const handleAdd = useCallback(() => {
    setNewName('');
    setNewDate(new Date());
    setShowDatePicker(Platform.OS === 'ios');
    setShowAddModal(true);
  }, []);

  const handleSaveNew = useCallback(() => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addUserHoliday(toDateISO(newDate), trimmed);
    setShowAddModal(false);
  }, [newName, newDate, addUserHoliday]);

  const handleReset = useCallback(() => {
    Alert.alert(t('settings.holidaysReset'), t('settings.holidaysResetConfirm'), [
      { text: t('settings.holidaysAddCancel'), style: 'cancel' },
      { text: t('settings.holidaysReset'), style: 'destructive', onPress: resetUserOverrides },
    ]);
  }, [t, resetUserOverrides]);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <GlassButton onPress={() => router.back()} size={38} accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={22} color={Palette.textPrimary} />
        </GlassButton>
        <Text style={styles.title} numberOfLines={1}>
          {t('settings.holidaysSection')}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + TAB_BAR_HEIGHT + Spacing.md },
        ]}
      >
        {/* ── Source info ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.holidaysSource')}</Text>
          <View style={styles.card}>
            <View style={styles.sourceRow}>
              <Ionicons name="globe-outline" size={20} color={Palette.accent} />
              <View style={styles.sourceText}>
                <Text style={styles.sourceLabel}>Nager.Date API</Text>
                <Text style={styles.sourceUrl}>date.nager.at</Text>
              </View>
            </View>
            <View style={styles.separator} />
            <View style={styles.descRow}>
              <Text style={styles.descText}>{t('settings.holidaysSourceDesc')}</Text>
            </View>
          </View>
        </View>

        {/* ── Holiday list (all in one, hidden shown inline) ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('settings.holidaysListTitle')} · {year}
          </Text>
          <View style={styles.card}>
            {holidays.map((h, i) => (
              <View key={`${h.date}-${h.isUserAdded ? 'u' : 'a'}`}>
                {i > 0 && <View style={styles.separator} />}
                <View style={[styles.holidayRow, h.isHidden && styles.holidayRowHidden]}>
                  <View style={styles.holidayInfo}>
                    <Text style={[styles.holidayName, h.isHidden && styles.hiddenText]}>
                      {h.name}
                    </Text>
                    <View style={styles.holidayMeta}>
                      <Text style={[styles.holidayDate, h.isHidden && styles.hiddenText]}>
                        {formatHolidayDate(h.date)}
                      </Text>
                      {h.isUserAdded && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{t('settings.holidaysUserAdded')}</Text>
                        </View>
                      )}
                      {h.isHidden && (
                        <View style={styles.hiddenBadge}>
                          <Text style={styles.hiddenBadgeText}>{t('settings.holidaysRemoved')}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {h.isHidden ? (
                    <Pressable hitSlop={12} onPress={() => restoreHoliday(h.date)}>
                      <Ionicons name="eye-outline" size={20} color={Palette.accent} />
                    </Pressable>
                  ) : (
                    <Pressable hitSlop={12} onPress={() => removeUserHoliday(h.date)}>
                      <Ionicons name="eye-off-outline" size={20} color={Palette.textTertiary} />
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Actions ── */}
        <View style={styles.section}>
          <View style={styles.card}>
            <Pressable
              style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}
              onPress={handleAdd}
            >
              <Ionicons name="add-circle-outline" size={20} color={Palette.accent} />
              <Text style={[styles.actionLabel, { color: Palette.accent }]}>
                {t('settings.holidaysAdd')}
              </Text>
            </Pressable>
          </View>
          {hasOverrides && (
            <View style={styles.card}>
              <Pressable
                style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}
                onPress={handleReset}
              >
                <Ionicons name="refresh-outline" size={20} color={Palette.destructive} />
                <Text style={[styles.actionLabel, { color: Palette.destructive }]}>
                  {t('settings.holidaysReset')}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Add Holiday Modal ── */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddModal(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>{t('settings.holidaysAdd')}</Text>

            <Text style={styles.inputLabel}>{t('settings.holidaysAddName')}</Text>
            <TextInput
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              placeholder={t('settings.holidaysAddNamePlaceholder')}
              placeholderTextColor={Palette.textTertiary}
              autoFocus
            />

            <Text style={styles.inputLabel}>{t('settings.holidaysAddDate')}</Text>
            {Platform.OS === 'android' && (
              <Pressable style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dateButtonText}>{formatHolidayDate(toDateISO(newDate))}</Text>
              </Pressable>
            )}
            {showDatePicker && (
              <DateTimePicker
                value={newDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(_, date) => {
                  if (Platform.OS === 'android') setShowDatePicker(false);
                  if (date) setNewDate(date);
                }}
                style={styles.datePicker}
              />
            )}

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>
                  {t('settings.holidaysAddCancel')}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveNew}
              >
                <Text style={styles.modalButtonSaveText}>
                  {t('settings.holidaysAddSave')}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    title: {
      flex: 1,
      fontSize: 22,
      fontWeight: '700',
      color: Palette.textPrimary,
    },
    content: {},
    section: {
      paddingHorizontal: Spacing.screenPadding,
      paddingBottom: Spacing.xl,
      gap: Spacing.md,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: Palette.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      paddingHorizontal: Spacing.xs,
    },
    card: {
      backgroundColor: Palette.card,
      borderRadius: Radius.lg,
      overflow: 'hidden',
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: Palette.separator,
      marginLeft: Spacing.cardPaddingX,
    },
    // ── Source ──
    sourceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
      paddingVertical: Spacing.cardPaddingY,
      paddingHorizontal: Spacing.cardPaddingX,
    },
    sourceText: { flex: 1 },
    sourceLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: Palette.textPrimary,
    },
    sourceUrl: {
      fontSize: 13,
      color: Palette.textTertiary,
      marginTop: 2,
    },
    descRow: {
      paddingVertical: Spacing.cardPaddingY,
      paddingHorizontal: Spacing.cardPaddingX,
    },
    descText: {
      fontSize: 13,
      color: Palette.textSecondary,
      lineHeight: 18,
    },
    // ── Holiday row ──
    holidayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.cardPaddingY,
      paddingHorizontal: Spacing.cardPaddingX,
      gap: Spacing.lg,
    },
    holidayRowHidden: {
      opacity: 0.45,
    },
    holidayInfo: { flex: 1 },
    holidayName: {
      fontSize: 16,
      color: Palette.textPrimary,
      fontWeight: '500',
    },
    holidayMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginTop: 2,
    },
    holidayDate: {
      fontSize: 13,
      color: Palette.textTertiary,
    },
    badge: {
      backgroundColor: Palette.accent + '1A',
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: Palette.accent,
    },
    hiddenText: {
      textDecorationLine: 'line-through',
    },
    hiddenBadge: {
      backgroundColor: Palette.textTertiary + '1A',
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
    },
    hiddenBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: Palette.textTertiary,
    },
    // ── Actions ──
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
      paddingVertical: Spacing.cardPaddingY,
      paddingHorizontal: Spacing.cardPaddingX,
    },
    actionRowPressed: {
      backgroundColor: Palette.cardPressed,
    },
    actionLabel: {
      fontSize: 16,
      fontWeight: '500',
    },
    // ── Modal ──
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.xxl,
    },
    modalContent: {
      width: '100%',
      backgroundColor: Palette.card,
      borderRadius: Radius.lg,
      padding: Spacing.xxl,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: Palette.textPrimary,
      marginBottom: Spacing.xl,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: Palette.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      marginBottom: Spacing.sm,
      marginTop: Spacing.md,
    },
    input: {
      backgroundColor: Palette.background,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md + 2,
      fontSize: 16,
      color: Palette.textPrimary,
    },
    dateButton: {
      backgroundColor: Palette.background,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md + 2,
    },
    dateButtonText: {
      fontSize: 16,
      color: Palette.textPrimary,
    },
    datePicker: {
      alignSelf: 'flex-start',
    },
    modalButtons: {
      flexDirection: 'row',
      gap: Spacing.md,
      marginTop: Spacing.xxl,
    },
    modalButton: {
      flex: 1,
      paddingVertical: Spacing.md + 2,
      borderRadius: Radius.md,
      alignItems: 'center',
    },
    modalButtonCancel: {
      backgroundColor: Palette.background,
    },
    modalButtonCancelText: {
      fontSize: 16,
      fontWeight: '600',
      color: Palette.textSecondary,
    },
    modalButtonSave: {
      backgroundColor: Palette.accent,
    },
    modalButtonSaveText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });
