import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { useTheme } from '../theme/ThemeContext';
import { DIFFICULTY_LABELS } from '../engine/types';
import { formatTime } from '../utils/format';

export function Header() {
  const { theme } = useTheme();
  const difficulty = useGameStore((s) => s.difficulty);
  const isDaily = useGameStore((s) => s.isDaily);
  const mistakes = useGameStore((s) => s.mistakes);
  const limitMistakes = useGameStore((s) => s.limitMistakes);
  const elapsed = useGameStore((s) => s.elapsedSeconds);
  const paused = useGameStore((s) => s.paused);
  const status = useGameStore((s) => s.status);
  const setPaused = useGameStore((s) => s.setPaused);

  const Item = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <View style={styles.item}>
      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.value, { color: color ?? theme.text }]}>{value}</Text>
    </View>
  );

  return (
    <View style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Item
        label={isDaily ? 'Daily' : 'Difficulty'}
        value={DIFFICULTY_LABELS[difficulty]}
      />
      <View style={[styles.divider, { backgroundColor: theme.border }]} />
      <Item
        label="Mistakes"
        value={limitMistakes ? `${mistakes}/3` : String(mistakes)}
        color={mistakes > 0 ? theme.error : theme.text}
      />
      <View style={[styles.divider, { backgroundColor: theme.border }]} />
      <Item label="Time" value={formatTime(elapsed)} />
      <Pressable
        onPress={() => setPaused(!paused)}
        disabled={status !== 'playing'}
        accessibilityRole="button"
        accessibilityLabel={paused ? 'Resume' : 'Pause'}
        style={({ pressed }) => [
          styles.pauseBtn,
          {
            backgroundColor: paused ? theme.accent : theme.surfaceAlt,
            borderColor: paused ? theme.accent : theme.border,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Text style={{ fontSize: 14, color: paused ? theme.accentText : theme.text }}>
          {paused ? '▶' : '❚❚'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  item: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  value: {
    fontSize: 17,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  divider: {
    width: 1,
    height: 28,
  },
  pauseBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
