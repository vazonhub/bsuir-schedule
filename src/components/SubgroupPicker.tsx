import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { GlassButton } from '@components/GlassButton';
import type { SubgroupChoice } from '@stores/preferences.store';
import { Palette, Radius, Spacing } from '@theme';

interface Props {
  value: SubgroupChoice;
  onChange(value: SubgroupChoice): void;
}

const A11Y_LABELS: Record<SubgroupChoice, string> = {
  0: 'Все',
  1: '1 подгруппа',
  2: '2 подгруппа',
};

const ORDER: SubgroupChoice[] = [0, 1, 2];

interface OptionLabelProps {
  value: SubgroupChoice;
  active?: boolean;
  size?: 'sm' | 'md';
}

const OptionLabel = ({ value, active = false, size = 'sm' }: OptionLabelProps) => {
  const color = active ? Palette.accent : Palette.textPrimary;
  const iconSize = size === 'sm' ? 16 : 18;
  const textStyle = [size === 'sm' ? styles.label : styles.rowText, active && styles.activeText];
  if (value === 0) {
    if (size === 'sm') {
      return <Ionicons name="people" size={iconSize + 2} color={color} />;
    }
    return (
      <View style={styles.optionInline}>
        <Ionicons name="people" size={iconSize + 2} color={color} />
        <Text style={textStyle}>Все</Text>
      </View>
    );
  }
  return (
    <View style={styles.optionInline}>
      <Ionicons name="person" size={iconSize} color={color} />
      <Text style={textStyle}>{value}</Text>
    </View>
  );
};

/**
 * Subgroup selector chip. Tap shows a small floating menu in the top-right
 * area of the screen with three options. Tapping outside closes.
 */
export const SubgroupPicker = ({ value, onChange }: Props) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (next: SubgroupChoice) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <>
      <GlassButton
        onPress={() => setOpen(true)}
        height={38}
        shape="pill"
        active={open}
        accessibilityLabel={`Подгруппа: ${A11Y_LABELS[value]}`}
      >
        <OptionLabel value={value} active={open} size="sm" />
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={open ? Palette.accent : Palette.textSecondary}
        />
      </GlassButton>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.menu} onPress={() => undefined /* swallow */}>
            {Platform.OS === 'web' ? (
              <View style={[StyleSheet.absoluteFill, styles.webBg]} />
            ) : (
              <BlurView
                intensity={90}
                tint="systemThickMaterial"
                experimentalBlurMethod="dimezisBlurView"
                style={StyleSheet.absoluteFill}
              />
            )}
            <View style={styles.menuTint} />
            {ORDER.map((opt) => {
              const active = opt === value;
              return (
                <Pressable
                  key={opt}
                  onPress={() => handleSelect(opt)}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  accessibilityLabel={A11Y_LABELS[opt]}
                >
                  <OptionLabel value={opt} active={active} size="md" />
                  {active && <Text style={[styles.check, styles.activeText]}>✓</Text>}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: Palette.textPrimary },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)' },
  menu: {
    position: 'absolute',
    top: 100, // под FloatingTopBar; точная координата выставляется наживую
    right: Spacing.screenPadding,
    minWidth: 160,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    paddingVertical: Spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  menuTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.18)' },
  webBg: { backgroundColor: 'rgba(255,255,255,0.92)' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  rowPressed: { backgroundColor: 'rgba(0,0,0,0.05)' },
  rowText: { fontSize: 16, color: Palette.textPrimary },
  activeText: { color: Palette.accent, fontWeight: '600' },
  check: { fontSize: 16 },
  optionInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
