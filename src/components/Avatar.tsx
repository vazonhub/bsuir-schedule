import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { usePalette } from '@hooks/usePalette';

type PaletteType = ReturnType<typeof usePalette>;

interface Props {
  /** Remote URL of the avatar image. If absent / errored, initials are shown. */
  uri?: string | null;
  /** Fallback text shown when the image is unavailable (e.g. "ИФ" or "351001"). */
  initials?: string;
  /** Diameter of the avatar in points. */
  size?: number;
  /** Max characters for initials. Default 2 (for names); set higher for group numbers. */
  maxChars?: number;
}

/**
 * Circular avatar with graceful fallback to initials if the image fails to
 * load (or `uri` is missing). Used in EmployeeRow today; reusable wherever an
 * employee photo is needed (e.g. lesson details sheet in Phase 5).
 */
export const Avatar = ({ uri, initials, size = 44, maxChars = 2 }: Props) => {
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  const [errored, setErrored] = useState(false);
  const showImage = Boolean(uri) && !errored;
  const label =
    maxChars === 2 ? (initials ?? '?').slice(0, 2).toUpperCase() : (initials ?? '?').toUpperCase();
  const fontSize =
    label.length <= 2 ? Math.round(size * 0.38) : Math.round((size * 0.7) / label.length);

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.initials, { fontSize }]}>{label}</Text>
      {showImage && (
        <Image
          source={uri ?? undefined}
          style={[styles.image, { borderRadius: size / 2 }]}
          onError={() => setErrored(true)}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={120}
          accessibilityIgnoresInvertColors
        />
      )}
    </View>
  );
};

const makeStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    container: {
      backgroundColor: Palette.cardPressed,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    image: {
      ...StyleSheet.absoluteFillObject,
      width: '100%',
      height: '100%',
    },
    initials: {
      color: Palette.textSecondary,
      fontWeight: '600',
    },
  });
