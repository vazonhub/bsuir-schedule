import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@components/Avatar';
import { usePalette } from '@hooks/usePalette';

type PaletteType = ReturnType<typeof usePalette>;

interface AvatarItem {
  uri?: string | null;
  initials: string;
}

interface Props {
  /** List of avatars to display (first two are shown, rest collapsed into "+N"). */
  items: AvatarItem[];
  /** Diameter of each avatar in points. */
  size?: number;
  /** How many pixels the second avatar overlaps the first. Defaults to size * 0.3. */
  overlap?: number;
  /** Max avatars to show before collapsing into "+N". Default 2. */
  max?: number;
  /** Max characters for initials in each avatar. Default 2. */
  maxChars?: number;
}

export const AvatarGroup = ({ items, size = 48, overlap, max = 2, maxChars }: Props) => {
  const Palette = usePalette();
  const actualOverlap = overlap ?? Math.round(size * 0.3);
  const styles = useMemo(() => makeStyles(Palette), [Palette]);

  if (items.length === 0) return null;
  if (items.length === 1) {
    const item = items[0]!;
    return <Avatar uri={item.uri} initials={item.initials} size={size} maxChars={maxChars} />;
  }

  const visible = items.slice(0, max);
  const extra = items.length - max;
  // Reverse: rightmost = first teacher, leftmost = last visible (or badge)
  const reversed = [...visible].reverse();

  return (
    <View style={[styles.container, { height: size }]}>
      {extra > 0 && (
        <View
          style={[
            styles.badge,
            {
              width: size * 0.6,
              height: size * 0.6,
              borderRadius: (size * 0.6) / 2,
              backgroundColor: Palette.cardPressed,
              borderColor: Palette.card,
              zIndex: reversed.length + 1,
            },
          ]}
        >
          <Text style={[styles.badgeText, { fontSize: Math.round(size * 0.24), color: Palette.textSecondary }]}>
            {extra}+
          </Text>
        </View>
      )}
      {reversed.map((item, i) => (
        <View
          key={i}
          style={[
            styles.avatarWrapper,
            {
              marginLeft: (i === 0 && extra <= 0) ? 0 : -actualOverlap,
              zIndex: i === reversed.length - 1 ? reversed.length + 1 : i,
              borderRadius: (size + 4) / 2,
              borderColor: Palette.card,
            },
          ]}
        >
          <Avatar uri={item.uri} initials={item.initials} size={size} maxChars={maxChars} />
        </View>
      ))}
    </View>
  );
};

const makeStyles = (Palette: PaletteType) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    borderWidth: 2,
    borderColor: Palette.card,
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
    borderWidth: 2,
  },
  badgeText: {
    fontWeight: '700',
  },
});
