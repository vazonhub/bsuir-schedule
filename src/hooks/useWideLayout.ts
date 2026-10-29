import { useWindowDimensions } from 'react-native';

import { Layout } from '@theme';

/**
 * Live window size + wide-layout flag. Reacts to rotation and iPad Split View /
 * Slide Over resizes (unlike a module-load `Dimensions.get()` snapshot), so use
 * this wherever a value drives visible layout: grid column counts, pane slide
 * distances, fullscreen media boxes, etc.
 */
export const useWideLayout = () => {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    /** True on tablet-class widths (iPad, landscape, wide Split View). */
    isWide: width >= Layout.wideBreakpoint,
    /** Content column width, capped on wide screens. */
    contentWidth: Math.min(width, Layout.maxContentWidth),
  };
};
