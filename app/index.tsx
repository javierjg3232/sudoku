import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../src/theme/ThemeContext';
import { useGameStore, hasSavedGame, loadStats } from '../src/store/gameStore';
import { Difficulty, DIFFICULTIES, DIFFICULTY_LABELS } from '../src/engine/types';
import { dateKey, shortLabel } from '../src/utils/date';

export default function Home() {
  const { theme, isDark, toggle } = useTheme();
  const router = useRouter();
  const newGame = useGameStore((s) => s.newGame);
  const newDailyGame = useGameStore((s) => s.newDailyGame);
  const loadFromStorage = useGameStore((s) => s.loadFromStorage);
  const loadSettings = useGameStore((s) => s.loadSettings);
  const limitMistakes = useGameStore((s) => s.limitMistakes);
  const setLimitMistakes = useGameStore((s) => s.setLimitMistakes);

  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [canContinue, setCanContinue] = useState(false);
  const [dailyDone, setDailyDone] = useState(false);
  const [dailyStreak, setDailyStreak] = useState(0);

  const today = dateKey();

  useFocusEffect(
    useCallback(() => {
      hasSavedGame().then(setCanContinue);
      loadSettings();
      loadStats().then((stats) => {
        setDailyDone(stats.daily.lastCompletedKey === today);
        setDailyStreak(stats.daily.streak);
      });
    }, [today])
  );

  const startNew = () => {
    newGame(difficulty);
    router.push('/game');
  };

  const startDaily = () => {
    newDailyGame();
    router.push('/game');
  };

  const resume = async () => {
    const ok = await loadFromStorage();
    if (ok) router.push('/game');
    else setCanContinue(false);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.themeToggleWrap}>
          <Pressable
            onPress={toggle}
            accessibilityRole="button"
            accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={[styles.themeToggle, { borderColor: theme.border, backgroundColor: theme.surface }]}
          >
            <Text style={{ fontSize: 18 }}>{isDark ? '☀️' : '🌙'}</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={[styles.logo, { backgroundColor: theme.accent }]}>
            <Text style={styles.logoText}>#</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Sudoku</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            A calm place to think in numbers.
          </Text>
        </View>

        <View style={styles.body}>
          <Pressable
            onPress={startDaily}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.daily,
              {
                backgroundColor: theme.surface,
                borderColor: dailyDone ? theme.border : theme.accent,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.99 : 1 }],
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.dailyTitle, { color: theme.text }]}>
                {dailyDone ? '✓ ' : ''}Daily Puzzle · {shortLabel(today)}
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 2 }}>
                {dailyDone
                  ? 'Completed — come back tomorrow!'
                  : 'Same board for everyone, every day'}
              </Text>
            </View>
            {dailyStreak > 0 && (
              <View style={[styles.streak, { backgroundColor: theme.accentSoft }]}>
                <Text style={{ color: theme.accent, fontWeight: '700', fontSize: 14 }}>
                  🔥 {dailyStreak}
                </Text>
              </View>
            )}
          </Pressable>

          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>DIFFICULTY</Text>
          <View style={styles.chips}>
            {DIFFICULTIES.map((d) => {
              const active = d === difficulty;
              return (
                <Pressable
                  key={d}
                  onPress={() => setDifficulty(d)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: active ? theme.accent : theme.surface,
                      borderColor: active ? theme.accent : theme.border,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: active ? theme.accentText : theme.text,
                      fontWeight: active ? '700' : '500',
                      fontSize: 15,
                    }}
                  >
                    {DIFFICULTY_LABELS[d]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={startNew}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.primary,
              { backgroundColor: theme.accent, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
            ]}
          >
            <Text style={[styles.primaryText, { color: theme.accentText }]}>New Game</Text>
          </Pressable>

          {canContinue && (
            <Pressable
              onPress={resume}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.secondary,
                { borderColor: theme.border, backgroundColor: theme.surface, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <Text style={[styles.secondaryText, { color: theme.text }]}>Continue Game</Text>
            </Pressable>
          )}

          <View style={[styles.settingRow, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontSize: 15, fontWeight: '600' }}>
                3-mistake limit
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 1 }}>
                Game ends after three wrong entries
              </Text>
            </View>
            <Switch
              value={limitMistakes}
              onValueChange={setLimitMistakes}
              trackColor={{ true: theme.accent, false: theme.border }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Toggle three mistake limit"
            />
          </View>

          <Pressable onPress={() => router.push('/stats')} style={styles.linkBtn} accessibilityRole="link">
            <Text style={[styles.link, { color: theme.textMuted }]}>View Statistics →</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 24 },
  themeToggleWrap: { alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 8 },
  themeToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: { alignItems: 'center', marginTop: 12, marginBottom: 28 },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  logoText: { color: '#fff', fontSize: 40, fontWeight: '800', marginTop: -2 },
  title: { fontSize: 38, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, marginTop: 6 },
  body: { paddingHorizontal: 24 },
  daily: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  dailyTitle: { fontSize: 16, fontWeight: '700' },
  streak: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 10,
  },
  sectionLabel: { fontSize: 12, letterSpacing: 1, marginBottom: 12, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  chip: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    flexGrow: 1,
    alignItems: 'center',
  },
  primary: {
    paddingVertical: 17,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryText: { fontSize: 18, fontWeight: '700' },
  secondary: {
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryText: { fontSize: 16, fontWeight: '600' },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  linkBtn: { alignItems: 'center', marginTop: 20, padding: 8 },
  link: { fontSize: 15, fontWeight: '500' },
});
