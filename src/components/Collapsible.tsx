import { useEffect, useRef, useState } from 'react';
import type { LayoutChangeEvent, ViewStyle } from 'react-native';
import { Animated, StyleSheet, View } from 'react-native';

import { useReduceMotion } from '@hooks/useAccessibility';

interface Props {
  expanded: boolean;
  children: React.ReactNode;
  duration?: number;
  style?: ViewStyle;
}

/**
 * Smoothly animates height between 0 and the content's natural height.
 * Content is always mounted (for layout measurement) but clipped when collapsed.
 */
export const Collapsible = ({ expanded, children, duration = 300, style }: Props) => {
  const reduceMotion = useReduceMotion();
  const animValue = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const [contentHeight, setContentHeight] = useState(0);
  const measured = useRef(false);

  const onLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && (!measured.current || Math.abs(h - contentHeight) > 1)) {
      measured.current = true;
      setContentHeight(h);
    }
  };

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: expanded ? 1 : 0,
      duration: reduceMotion ? 0 : duration,
      useNativeDriver: false,
    }).start();
  }, [expanded, animValue, duration, reduceMotion]);

  const height = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, contentHeight || 0],
  });

  const opacity = animValue.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <Animated.View
      style={[styles.container, { height: contentHeight ? height : undefined, opacity }, style]}
    >
      <View onLayout={onLayout} style={styles.inner}>
        {children}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  inner: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
});
