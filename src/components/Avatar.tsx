import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { usePalette } from '@hooks/usePalette';

type PaletteType = ReturnType<typeof usePalette>;

interface Props {
  /** Remote URL of the avatar image. If absent / errored, initials are shown. */
  uri?: string | null;
  /** 1-2 letter fallback shown when the image is unavailable. */
  initials?: string;
  /** Diameter of the avatar in points. */
  size?: number;
}

/**
 * Circular avatar with graceful fallback to initials if the image fails to
 * load (or `uri` is missing). Used in EmployeeRow today; reusable wherever an
 * employee photo is needed (e.g. lesson details sheet in Phase 5).
 */
export const Avatar = ({ uri, initials, size = 44 }: Props) => {
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  const [errored, setErrored] = useState(false);
  const showImage = Boolean(uri) && !errored;

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      {showImage ? (
        <Image
          source={uri ?? undefined}
          style={[styles.image, { borderRadius: size / 2 }]}
          onError={() => setErrored(true)}
          contentFit="cover"
          // memory-disk: первый раз грузим по сети, затем берём с диска;
          // повторный mount Avatar (например, после возврата на экран) отдаёт
          // картинку моментально без визуального «мига».
          cachePolicy="memory-disk"
          transition={120}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text style={[styles.initials, { fontSize: Math.round(size * 0.38) }]}>
          {(initials ?? '?').slice(0, 2).toUpperCase()}
        </Text>
      )}
    </View>
  );
};

const makeStyles = (Palette: PaletteType) => StyleSheet.create({
  container: {
    backgroundColor: Palette.cardPressed,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initials: {
    color: Palette.textSecondary,
    fontWeight: '600',
  },
});
