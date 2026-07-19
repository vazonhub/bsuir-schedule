import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePalette } from '@hooks/usePalette';
import { Radius, Spacing } from '@theme';

const FALLBACK_STORE_URL = Platform.select({
  ios: 'https://apps.apple.com/by/app/bsuir-time/id6762343557',
  default: 'https://play.google.com/store/apps/details?id=by.vazon.bsuirtime',
});

type PaletteType = ReturnType<typeof usePalette>;

interface Props {
  visible: boolean;
  version: string | null;
  releaseNotes: string | null;
  storeUrl: string | null;
  onClose: () => void;
}

export const UpdateModal = ({ visible, version, releaseNotes, storeUrl, onClose }: Props) => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);

  const handleOpenStore = useCallback(() => {
    const url = storeUrl ?? FALLBACK_STORE_URL;
    if (Platform.OS === 'android') {
      const id = url.match(/id=([^&]+)/)?.[1] ?? 'by.vazon.bsuirtime';
      void Linking.openURL(`market://details?id=${id}`).catch(() => Linking.openURL(url));
    } else {
      void Linking.openURL(url);
    }
  }, [storeUrl]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Drag indicator */}
        <View style={styles.dragIndicatorRow}>
          <View style={styles.dragIndicator} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{t('update.title')}</Text>
            {version && <Text style={styles.version}>v{version}</Text>}
          </View>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel={t('update.close')}>
            <Ionicons name="close-circle-outline" size={28} color={Palette.textTertiary} />
          </Pressable>
        </View>

        {/* Release notes */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.notes}>{releaseNotes || t('update.noNotes')}</Text>
        </ScrollView>

        {/* Actions */}
        <View style={[styles.actions, { paddingBottom: insets.bottom || Spacing.xl }]}>
          <Pressable
            style={({ pressed }) => [styles.storeButton, pressed && styles.storeButtonPressed]}
            onPress={handleOpenStore}
          >
            <Ionicons name="storefront-outline" size={20} color="#FFFFFF" />
            <Text style={styles.storeButtonText}>{t('update.openStore')}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>{t('update.close')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Palette.background,
    },
    dragIndicatorRow: {
      alignItems: 'center',
      paddingTop: Spacing.md,
      paddingBottom: Spacing.xs,
    },
    dragIndicator: {
      width: 36,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: Palette.textTertiary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.screenPadding + Spacing.xs,
      paddingVertical: Spacing.lg,
    },
    headerText: {
      flex: 1,
      gap: Spacing.xs,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: Palette.textPrimary,
    },
    version: {
      fontSize: 15,
      fontWeight: '500',
      color: Palette.textSecondary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: Spacing.screenPadding + Spacing.xs,
      paddingBottom: Spacing.xl,
    },
    notes: {
      fontSize: 16,
      lineHeight: 24,
      color: Palette.textPrimary,
    },
    actions: {
      paddingHorizontal: Spacing.screenPadding,
      paddingTop: Spacing.lg,
      gap: Spacing.md,
    },
    storeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.md,
      backgroundColor: Palette.accent,
      borderRadius: Radius.md,
      paddingVertical: Spacing.cardPaddingY,
    },
    storeButtonPressed: {
      opacity: 0.85,
    },
    storeButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    closeButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.md,
    },
    closeButtonPressed: {
      opacity: 0.6,
    },
    closeButtonText: {
      fontSize: 16,
      fontWeight: '500',
      color: Palette.textSecondary,
    },
  });
