import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { useTheme } from '../theme/ThemeContext';
import { SIZE } from '../engine/types';

export function NumberPad() {
  const { theme } = useTheme();
  const values = useGameStore((s) => s.values);
  const notesMode = useGameStore((s) => s.notesMode);
  const inputNumber = useGameStore((s) => s.inputNumber);

  const remaining = useMemo(() => {
    const counts = new Array(SIZE + 1).fill(0);
    for (const v of values) if (v > 0) counts[v]++;
    return counts.map((c) => SIZE - c);
  }, [values]);

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
        const done = remaining[n] <= 0;
        return (
          <Pressable
            key={n}
            disabled={done}
            onPress={() => inputNumber(n)}
            accessibilityRole="button"
            accessibilityLabel={`Enter ${n}${notesMode ? ' as note' : ''}, ${remaining[n]} remaining`}
            accessibilityState={{ disabled: done }}
            style={({ pressed }) => [
              styles.key,
              {
                backgroundColor: pressed ? theme.accentSoft : theme.surface,
                borderColor: theme.border,
                opacity: done ? 0.32 : 1,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              },
            ]}
          >
            <Text
              style={{
                fontSize: 26,
                fontWeight: '500',
                color: notesMode ? theme.textMuted : theme.accent,
              }}
            >
              {n}
            </Text>
            {!done && (
              <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 1 }}>
                {remaining[n]}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  key: {
    width: 56,
    height: 58,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
