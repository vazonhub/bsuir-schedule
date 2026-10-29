import { StyleSheet } from 'react-native';

/**
 * Responsive layout tokens.
 *
 * The app is phone-first. On wide screens (iPad, landscape, Split View) we do
 * NOT build a separate tablet layout — we just cap the content column to a
 * comfortable reading width and center it, instead of letting lists, cards and
 * sheets stretch edge-to-edge.
 */
export const Layout = {
  /** Max width (pt) of a readable content column on wide screens. */
  maxContentWidth: 700,
  /** Max width (pt) for a centered dialog / bottom sheet on wide screens. */
  maxSheetWidth: 640,
  /** Min window width (pt) treated as a wide (tablet-class) layout. */
  wideBreakpoint: 700,
} as const;

/**
 * Ready-made styles for capping + centering content. Spread into a list's
 * `contentContainerStyle` or a sheet's `style` so the column never stretches
 * past `Layout.maxContentWidth` / `maxSheetWidth` on iPad.
 */
export const LayoutStyles = StyleSheet.create({
  /** Center a content column and cap it at `maxContentWidth`. */
  centeredContent: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
  },
  /** Center a sheet/dialog column and cap it at `maxSheetWidth`. */
  centeredSheet: {
    width: '100%',
    maxWidth: Layout.maxSheetWidth,
    alignSelf: 'center',
  },
});
