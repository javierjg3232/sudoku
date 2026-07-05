import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../src/theme/ThemeContext';
import { loadStats, Stats, emptyStats } from '../src/store/gameStore';
import { DIFFICULTIES, DIFFICULTY_LABELS } from '../src/engine/types';
import { formatTime } from '../src/utils/format';

export default function StatsScreen() {
  const { theme } = useTheme();
  const [stats, setStats] = useState<Stats>(emptyStats());

  useFocusEffect(
    useCallback(() => {
      loadStats().then(setStats);
    }, [])
  );

  const totalWins = DIFFICULTIES.reduce(
    (sum, d) => sum + stats.byDifficulty[d].completions,
    0
  );

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.summary, { backgroundColor: theme.accent }]}>
        <Text style={[styles.summaryValue, { color: theme.accentText }]}>{totalWins}</Text>
        <Text style={[styles.summaryLabel, { color: theme.accentText }]}>
          Puzzle{totalWins === 1 ? '' : 's'} Solved
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>🔥 Daily Streak</Text>
        <View style={styles.cardRow}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: theme.accent }]}>{stats.daily.streak}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Current</Text>
          </View>
          <View style={[styles.dividerV, { backgroundColor: theme.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: theme.text }]}>{stats.daily.bestStreak}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Best</Text>
          </View>
        </View>
      </View>

      {DIFFICULTIES.map((d) => {
        const s = stats.byDifficulty[d];
        const winRate = s.started > 0 ? Math.round((s.completions / s.started) * 100) : null;
        const avg = s.completions > 0 ? Math.round(s.totalTimeSeconds / s.completions) : null;
        return (
          <View
            key={d}
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Text style={[styles.cardTitle, { color: theme.text }]}>{DIFFICULTY_LABELS[d]}</Text>
            <View style={styles.cardRow}>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: theme.accent }]}>{s.completions}</Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Solved</Text>
              </View>
              <View style={[styles.dividerV, { backgroundColor: theme.border }]} />
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {winRate === null ? '—' : `${winRate}%`}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Win rate</Text>
              </View>
              <View style={[styles.dividerV, { backgroundColor: theme.border }]} />
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {s.bestTimeSeconds === null ? '—' : formatTime(s.bestTimeSeconds)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Best</Text>
              </View>
              <View style={[styles.dividerV, { backgroundColor: theme.border }]} />
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {avg === null ? '—' : formatTime(avg)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Average</Text>
              </View>
            </View>
          </View>
        );
      })}

      {totalWins === 0 && (
        <Text style={[styles.empty, { color: theme.textMuted }]}>
          No puzzles solved yet. Start a game to build your streak!
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14 },
  summary: {
    borderRadius: 20,
    paddingVertical: 28,
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryValue: { fontSize: 48, fontWeight: '800' },
  summaryLabel: { fontSize: 15, fontWeight: '600', marginTop: 2 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 11, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  dividerV: { width: 1, height: 40 },
  empty: { textAlign: 'center', fontSize: 15, marginTop: 16, lineHeight: 22 },
});
