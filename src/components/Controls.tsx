import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useGameStore, HINT_LIMIT } from '../store/gameStore';
import { useTheme } from '../theme/ThemeContext';
import { Theme } from '../theme/colors';

interface ActionProps {
  label: string;
  glyph: string;
  onPress: () => void;
  theme: Theme;
  active?: boolean;
  badge?: number;
  disabled?: boolean;
}

function Action({ label, glyph, onPress, theme, active, badge, disabled }: ActionProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active, disabled: !!disabled }}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: active ? theme.accent : theme.surface,
          borderColor: active ? theme.accent : theme.border,
          transform: [{ scale: pressed ? 0.94 : 1 }],
          opacity: disabled ? 0.35 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={{ fontSize: 20, color: active ? theme.accentText : theme.text }}>
        {glyph}
      </Text>
      <Text
        style={{
          fontSize: 10,
          marginTop: 3,
          color: active ? theme.accentText : theme.textMuted,
        }}
      >
        {label}
      </Text>
      {badge !== undefined && badge > 0 && (
        <View style={[styles.badge, { backgroundColor: theme.accent }]}>
          <Text style={{ fontSize: 9, color: theme.accentText, fontWeight: '700' }}>
            {badge}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function Controls() {
  const { theme } = useTheme();
  const notesMode = useGameStore((s) => s.notesMode);
  const undoCount = useGameStore((s) => s.undoStack.length);
  const hintsUsed = useGameStore((s) => s.hintsUsed);
  const hintsLeft = HINT_LIMIT - hintsUsed;
  const undo = useGameStore((s) => s.undo);
  const erase = useGameStore((s) => s.erase);
  const toggleNotes = useGameStore((s) => s.toggleNotes);
  const autoNotes = useGameStore((s) => s.autoNotes);
  const hint = useGameStore((s) => s.hint);

  return (
    <View style={styles.row}>
      <Action label="Undo" glyph="↶" onPress={undo} theme={theme} badge={undoCount} />
      <Action label="Erase" glyph="⌫" onPress={erase} theme={theme} />
      <Action
        label="Notes"
        glyph="✎"
        onPress={toggleNotes}
        theme={theme}
        active={notesMode}
      />
      <Action label="Auto Note" glyph="⚡" onPress={autoNotes} theme={theme} />
      <Action
        label="Hint"
        glyph="💡"
        onPress={hint}
        theme={theme}
        badge={hintsLeft}
        disabled={hintsLeft <= 0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  action: {
    width: 58,
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
