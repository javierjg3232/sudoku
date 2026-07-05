import React, { useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  AppState,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme/ThemeContext';
import { useGameStore } from '../src/store/gameStore';
import { Header } from '../src/components/Header';
import { Board } from '../src/components/Board';
import { NumberPad } from '../src/components/NumberPad';
import { Controls } from '../src/components/Controls';
import { Confetti } from '../src/components/Confetti';
import { DIFFICULTY_LABELS } from '../src/engine/types';
import { formatTime } from '../src/utils/format';

// Module-scope components so their identity is stable across Game renders —
// defining them inside Game would remount the subtree on every render.

function PausedCard() {
  const { theme } = useTheme();
  const elapsed = useGameStore((s) => s.elapsedSeconds);
  const setPaused = useGameStore((s) => s.setPaused);
  return (
    <Pressable
      onPress={() => setPaused(false)}
      accessibilityRole="button"
      accessibilityLabel="Resume game"
      style={[
        styles.pausedCard,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <Text style={{ fontSize: 44 }}>☕️</Text>
      <Text style={[styles.pausedTitle, { color: theme.text }]}>Paused</Text>
      <Text style={{ color: theme.textMuted, fontSize: 14 }}>
        Tap to resume · {formatTime(elapsed)}
      </Text>
    </Pressable>
  );
}

function ResultModal({
  visible,
  emoji,
  title,
  showConfetti,
  onNewGame,
  onHome,
}: {
  visible: boolean;
  emoji: string;
  title: string;
  showConfetti?: boolean;
  onNewGame: () => void;
  onHome: () => void;
}) {
  const { theme } = useTheme();
  const difficulty = useGameStore((s) => s.difficulty);
  const isDaily = useGameStore((s) => s.isDaily);
  const elapsed = useGameStore((s) => s.elapsedSeconds);
  const mistakes = useGameStore((s) => s.mistakes);
  const subtitle = `${isDaily ? 'Daily · ' : ''}${DIFFICULTY_LABELS[difficulty]} · ${formatTime(elapsed)} · ${mistakes} mistake${mistakes === 1 ? '' : 's'}`;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        {showConfetti && <Confetti />}
        <View style={[styles.modalCard, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
          <View style={[styles.trophy, { backgroundColor: theme.accentSoft }]}>
            <Text style={{ fontSize: 40 }}>{emoji}</Text>
          </View>
          <Text style={[styles.modalTitle, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.modalSub, { color: theme.textMuted }]}>{subtitle}</Text>

          <Pressable
            onPress={onNewGame}
            style={({ pressed }) => [styles.modalPrimary, { backgroundColor: theme.accent, opacity: pressed ? 0.9 : 1 }]}
          >
            <Text style={[styles.modalPrimaryText, { color: theme.accentText }]}>New Game</Text>
          </Pressable>
          <Pressable
            onPress={onHome}
            style={({ pressed }) => [styles.modalSecondary, { borderColor: theme.border, opacity: pressed ? 0.9 : 1 }]}
          >
            <Text style={[styles.modalSecondaryText, { color: theme.text }]}>Home</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function Game() {
  const { theme } = useTheme();
  const router = useRouter();

  // Note: no per-second subscriptions here (elapsedSeconds lives in Header,
  // PausedCard, and ResultModal) so the board isn't re-rendered on every tick.
  const status = useGameStore((s) => s.status);
  const paused = useGameStore((s) => s.paused);
  const initialized = useGameStore((s) => s.initialized);
  const tick = useGameStore((s) => s.tick);
  const newGame = useGameStore((s) => s.newGame);
  const difficulty = useGameStore((s) => s.difficulty);

  // Timer.
  useEffect(() => {
    const id = setInterval(() => tick(), 1000);
    return () => clearInterval(id);
  }, [tick]);

  // Auto-pause when the app goes to the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        const s = useGameStore.getState();
        if (s.status === 'playing' && !s.paused) s.setPaused(true);
      }
    });
    return () => sub.remove();
  }, []);

  // Keyboard input on web: 1-9 place, arrows move, N notes, Backspace erase,
  // U undo, H hint, P pause.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      // Leave browser/OS shortcuts (Cmd+1, Ctrl+N, ...) alone.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const s = useGameStore.getState();
      if (!s.initialized) return;
      if (e.key >= '1' && e.key <= '9') {
        s.inputNumber(Number(e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        s.erase();
      } else if (e.key === 'n' || e.key === 'N') {
        s.toggleNotes();
      } else if (e.key === 'u' || e.key === 'U') {
        s.undo();
      } else if (e.key === 'h' || e.key === 'H') {
        s.hint();
      } else if (e.key === 'p' || e.key === 'P') {
        s.setPaused(!s.paused);
      } else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const cur = s.selectedIndex ?? 0;
        const delta =
          e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' ? -9 : 9;
        const next = cur + delta;
        if (next >= 0 && next < 81) s.selectCell(next);
        else if (s.selectedIndex === null) s.selectCell(0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // If we somehow arrive without a game, bounce home.
  useEffect(() => {
    if (!initialized) router.replace('/');
  }, [initialized]);

  const playAgain = () => {
    newGame(difficulty);
  };
  const goHome = () => {
    router.replace('/');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['bottom']}>
      <View style={styles.container}>
        <Header />
        <View style={styles.boardWrap}>{paused ? <PausedCard /> : <Board />}</View>
        <View style={styles.controls}>
          <Controls />
          <NumberPad />
        </View>
      </View>

      <ResultModal
        visible={status === 'won'}
        emoji="🎉"
        title="Solved!"
        showConfetti
        onNewGame={playAgain}
        onHome={goHome}
      />
      <ResultModal
        visible={status === 'lost'}
        emoji="💔"
        title="Out of mistakes"
        onNewGame={playAgain}
        onHome={goHome}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  boardWrap: { alignItems: 'center', justifyContent: 'center' },
  pausedCard: {
    width: 320,
    height: 320,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pausedTitle: { fontSize: 24, fontWeight: '700' },
  controls: { gap: 16, paddingTop: 4 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
  },
  trophy: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 26, fontWeight: '800' },
  modalSub: { fontSize: 15, marginTop: 8, marginBottom: 24, textAlign: 'center' },
  modalPrimary: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalPrimaryText: { fontSize: 17, fontWeight: '700' },
  modalSecondary: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 10,
  },
  modalSecondaryText: { fontSize: 16, fontWeight: '600' },
});
