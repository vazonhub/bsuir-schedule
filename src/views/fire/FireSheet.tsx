import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FlameIcon } from '@components/fire/FlameIcon';
import { usePalette } from '@hooks/usePalette';
import { selectFireCore, useFireStore } from '@stores/fire.store';
import { Radius, Spacing } from '@theme';
import { FIRE_COLORS } from '@theme/colors';
import { textProps } from '@theme/typography';
import { WEEKLY_FREEZES, getFlameColor } from '@utils/fire';

import { ActivityCalendar } from './ActivityCalendar';

type PaletteType = ReturnType<typeof usePalette>;

export interface FireSheetRef {
  present(): void;
  dismiss(): void;
}

/**
 * Нижний шит огонька: крупное пламя + серия, рекорд, остаток заморозок и
 * календарь активности. Только чтение — не трогает контроллер/стор на запись.
 */
export const FireSheet = forwardRef<FireSheetRef>((_props, ref) => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  const sheetRef = useRef<BottomSheetModal>(null);
  const core = useFireStore(selectFireCore);
  const snapPoints = useMemo(() => ['70%'], []);

  useImperativeHandle(ref, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const accentColor = getFlameColor(core.current);
  const hasHistory = Object.keys(core.history).length > 0;

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      backgroundStyle={{ backgroundColor: Palette.card }}
      handleIndicatorStyle={{ backgroundColor: Palette.textTertiary }}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        {/* ── Крупное пламя + число ── */}
        <View style={styles.hero}>
          <FlameIcon current={core.current} size={52} />
          <Text {...textProps('title')} style={[styles.heroNumber, { color: accentColor }]}>
            {core.current}
          </Text>
          <Text {...textProps('subhead')} style={styles.heroLabel}>
            {t('fire.current')}
          </Text>
        </View>

        {/* ── Статы ── */}
        <View style={styles.statsRow}>
          <StatTile
            styles={styles}
            icon="trophy-outline"
            iconColor={Palette.textSecondary}
            label={t('fire.longest')}
            value={t('fire.days', { n: core.longest })}
          />
          <StatTile
            styles={styles}
            icon="snow-outline"
            iconColor={FIRE_COLORS.frozen}
            label={t('fire.freezes')}
            value={t('fire.freezesLeft', { n: core.freezes, max: WEEKLY_FREEZES })}
          />
        </View>

        {/* ── Календарь ── */}
        <View style={styles.section}>
          <Text {...textProps('footnote')} style={styles.sectionTitle}>
            {t('fire.calendarTitle')}
          </Text>
          {hasHistory ? (
            <ActivityCalendar history={core.history} accentColor={accentColor} />
          ) : (
            <Text {...textProps('footnote')} style={styles.empty}>
              {t('fire.empty')}
            </Text>
          )}
        </View>

        {/* ── Правила ── */}
        <Text {...textProps('footnote')} style={styles.rules}>
          {t('fire.rules')}
        </Text>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
FireSheet.displayName = 'FireSheet';

const StatTile = ({
  styles,
  icon,
  iconColor,
  label,
  value,
}: {
  styles: ReturnType<typeof makeStyles>;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
}) => (
  <View style={styles.statTile}>
    <Ionicons name={icon} size={18} color={iconColor} />
    <Text {...textProps('caption')} style={styles.statLabel}>
      {label}
    </Text>
    <Text {...textProps('headline')} style={styles.statValue}>
      {value}
    </Text>
  </View>
);

const makeStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: Spacing.xxl,
      paddingTop: Spacing.xs,
      paddingBottom: Spacing.xxxl,
      gap: Spacing.lg,
    },
    hero: {
      alignItems: 'center',
      gap: Spacing.xs,
    },
    heroNumber: {
      fontSize: 40,
      fontWeight: '800',
    },
    heroLabel: {
      color: Palette.textSecondary,
    },
    statsRow: {
      flexDirection: 'row',
      gap: Spacing.md,
    },
    statTile: {
      flex: 1,
      alignItems: 'center',
      gap: Spacing.xs,
      paddingVertical: Spacing.lg,
      borderRadius: Radius.md,
      backgroundColor: Palette.background,
    },
    statLabel: {
      color: Palette.textTertiary,
    },
    statValue: {
      color: Palette.textPrimary,
      fontWeight: '700',
    },
    section: {
      gap: Spacing.sm,
    },
    sectionTitle: {
      color: Palette.textSecondary,
      fontWeight: '600',
    },
    empty: {
      color: Palette.textTertiary,
      textAlign: 'center',
      paddingVertical: Spacing.lg,
    },
    rules: {
      color: Palette.textTertiary,
      lineHeight: 18,
    },
  });
