import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { hapticMedium } from '@utils/haptics';

interface Identifiable {
  id: string;
}

interface Props<T extends Identifiable> {
  items: T[];
  itemHeight: number;
  gap: number;
  /** Called with the new order once the user releases the drag. */
  onReorder(next: T[]): void;
  renderItem(item: T): ReactElement;
}

/**
 * Minimal sortable list built on gesture-handler + reanimated.
 *
 * - Long-press (~300 ms) picks up an item; the item lifts (scale, shadow, high
 *   z-index) and follows the finger via `translateY`.
 * - As the finger crosses ±½ slot boundaries, positions swap in real-time via a
 *   shared `Record<id, index>`. Non-dragged items animate to their new offset
 *   with a short spring-like timing curve.
 * - On release, the resulting order is flushed to the parent via `onReorder`.
 *
 * Written custom (~150 lines) so we don't pull in an extra dep just for the
 * planner. If the planner grows past ~20 items or needs cross-list dragging,
 * revisit and swap for `react-native-draggable-flatlist`.
 */
export function DraggablePlannerList<T extends Identifiable>({
  items,
  itemHeight,
  gap,
  onReorder,
  renderItem,
}: Props<T>) {
  const slotHeight = itemHeight + gap;

  // Shared: which item id is currently being dragged (or null).
  const draggingId = useSharedValue<string | null>(null);
  // Shared: current slot index for every item, keyed by id.
  const positions = useSharedValue<Record<string, number>>(
    Object.fromEntries(items.map((it, i) => [it.id, i])),
  );

  // Re-sync positions when the parent list changes shape (add/remove/prune).
  useEffect(() => {
    positions.value = Object.fromEntries(items.map((it, i) => [it.id, i]));
  }, [items, positions]);

  return (
    <View style={{ height: Math.max(items.length, 1) * slotHeight - gap }}>
      {items.map((item) => (
        <DraggableRow
          key={item.id}
          item={item}
          itemHeight={itemHeight}
          slotHeight={slotHeight}
          count={items.length}
          positions={positions}
          draggingId={draggingId}
          onReorder={onReorder}
          items={items}
          renderItem={renderItem}
        />
      ))}
    </View>
  );
}

interface RowProps<T extends Identifiable> {
  item: T;
  items: T[];
  itemHeight: number;
  slotHeight: number;
  count: number;
  positions: { value: Record<string, number> };
  draggingId: { value: string | null };
  onReorder(next: T[]): void;
  renderItem(item: T): ReactElement;
}

function DraggableRow<T extends Identifiable>({
  item,
  items,
  itemHeight,
  slotHeight,
  count,
  positions,
  draggingId,
  onReorder,
  renderItem,
}: RowProps<T>) {
  const panOffset = useSharedValue(0);
  const startSlot = useSharedValue(0);

  const isDragging = useDerivedValue(() => draggingId.value === item.id);
  const slot = useDerivedValue(() => positions.value[item.id] ?? 0);

  const animStyle = useAnimatedStyle(() => {
    if (isDragging.value) {
      const y = startSlot.value * slotHeight + panOffset.value;
      return {
        transform: [{ translateY: y }, { scale: 1.03 }],
        zIndex: 100,
        elevation: 8,
        shadowOpacity: 0.15,
      };
    }
    return {
      transform: [
        {
          translateY: withTiming(slot.value * slotHeight, {
            duration: 200,
            easing: Easing.out(Easing.quad),
          }),
        },
        { scale: 1 },
      ],
      zIndex: 0,
      elevation: 0,
      shadowOpacity: 0,
    };
  });

  const commitOrder = (): void => {
    const pos = positions.value;
    const byId = new Map(items.map((it) => [it.id, it]));
    const sortedIds = Object.entries(pos)
      .sort((a, b) => a[1] - b[1])
      .map(([id]) => id);
    const next: T[] = [];
    for (const id of sortedIds) {
      const it = byId.get(id);
      if (it) next.push(it);
    }
    // Only fire if the order actually changed.
    const same = next.length === items.length && next.every((n, i) => n.id === items[i]?.id);
    if (!same) onReorder(next);
  };

  const pan = Gesture.Pan()
    .activateAfterLongPress(300)
    .onStart(() => {
      draggingId.value = item.id;
      startSlot.value = positions.value[item.id] ?? 0;
      runOnJS(hapticMedium)();
    })
    .onUpdate((e) => {
      if (draggingId.value !== item.id) return;
      panOffset.value = e.translationY;
      const currentSlot = positions.value[item.id] ?? startSlot.value;
      const rawTarget = Math.round(
        (startSlot.value * slotHeight + e.translationY) / slotHeight,
      );
      const target = Math.min(Math.max(rawTarget, 0), count - 1);
      if (target !== currentSlot) {
        // Swap slots — everyone between current & target shifts by 1 toward
        // the vacated slot; the dragged item takes the target slot.
        const nextPositions: Record<string, number> = { ...positions.value };
        const dir = target > currentSlot ? 1 : -1;
        for (const [id, p] of Object.entries(nextPositions)) {
          if (id === item.id) continue;
          if (dir === 1 && p > currentSlot && p <= target) nextPositions[id] = p - 1;
          else if (dir === -1 && p < currentSlot && p >= target) nextPositions[id] = p + 1;
        }
        nextPositions[item.id] = target;
        positions.value = nextPositions;
      }
    })
    .onEnd(() => {
      draggingId.value = null;
      panOffset.value = 0;
      runOnJS(commitOrder)();
    })
    .onFinalize(() => {
      draggingId.value = null;
      panOffset.value = 0;
    });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.row,
          { height: itemHeight, top: 0, left: 0, right: 0 },
          animStyle,
        ]}
      >
        {renderItem(item)}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
  },
});
