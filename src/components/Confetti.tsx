import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const PIECES = 18;

/** Lightweight falling-confetti burst, no dependencies. Renders once on mount. */
export function Confetti({ height = 420 }: { height?: number }) {
  const { theme } = useTheme();
  const progress = useRef(new Animated.Value(0)).current;

  // Randomize each piece once per mount.
  const pieces = useRef(
    Array.from({ length: PIECES }, (_, i) => ({
      left: Math.random() * 100, // percent
      size: 6 + Math.random() * 6,
      spin: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 360),
      drift: (Math.random() - 0.5) * 60,
      color: [theme.accent, theme.accentSoft, theme.highlightStrong, theme.error][i % 4],
    }))
  ).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 2200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [progress]);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      {pieces.map((p, i) => {
        const translateY = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [-30, height],
        });
        const translateX = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, p.drift],
        });
        const rotate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${p.spin}deg`],
        });
        const opacity = progress.interpolate({
          inputRange: [0, 0.7, 1],
          outputRange: [1, 1, 0],
        });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              top: 0,
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 0.6,
              borderRadius: 2,
              backgroundColor: p.color,
              opacity,
              transform: [{ translateY }, { translateX }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
}
