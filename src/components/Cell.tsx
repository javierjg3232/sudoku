import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Theme } from '../theme/colors';
import { colOf, rowOf } from '../engine/types';

interface CellProps {
  index: number;
  value: number;
  given: boolean;
  notes: number[];
  size: number;
  theme: Theme;
  isSelected: boolean;
  isPeer: boolean; // shares row/col/box with selection
  isSameValue: boolean; // same value as the selected cell
  isConflict: boolean;
  isWrong: boolean; // placed but differs from solution
  // Stable reference + primitive index keeps React.memo effective.
  onSelect: (index: number) => void;
}

function CellBase({
  index,
  value,
  given,
  notes,
  size,
  theme,
  isSelected,
  isPeer,
  isSameValue,
  isConflict,
  isWrong,
  onSelect,
}: CellProps) {
  const row = rowOf(index);
  const col = colOf(index);

  let background = theme.surface;
  if (isPeer) background = theme.highlight;
  if (isSameValue) background = theme.highlightStrong;
  if (isSelected) background = theme.selected;

  let numberColor = given ? theme.givenText : theme.accent;
  if (isConflict || isWrong) numberColor = theme.error;

  const thick = theme.gridLineBold;
  const thin = theme.gridLine;

  const a11yValue =
    value !== 0
      ? `${value}${given ? ', given' : ''}`
      : notes.length > 0
        ? `notes ${notes.join(' ')}`
        : 'empty';

  return (
    <Pressable
      onPress={() => onSelect(index)}
      accessibilityRole="button"
      accessibilityLabel={`Row ${row + 1}, column ${col + 1}, ${a11yValue}`}
      accessibilityState={{ selected: isSelected }}
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: background,
        borderLeftWidth: col % 3 === 0 ? 2 : 1,
        borderTopWidth: row % 3 === 0 ? 2 : 1,
        borderRightWidth: col === 8 ? 2 : 0,
        borderBottomWidth: row === 8 ? 2 : 0,
        borderLeftColor: col % 3 === 0 ? thick : thin,
        borderTopColor: row % 3 === 0 ? thick : thin,
        borderRightColor: thick,
        borderBottomColor: thick,
      }}
    >
      {value !== 0 ? (
        <Text
          style={{
            fontSize: size * 0.52,
            color: numberColor,
            fontWeight: given ? '600' : '500',
          }}
        >
          {value}
        </Text>
      ) : notes.length > 0 ? (
        <View style={[styles.notes, { width: size, height: size }]}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <View key={n} style={{ width: size / 3, height: size / 3, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: size * 0.2, color: theme.textMuted, lineHeight: size * 0.26 }}>
                {notes.includes(n) ? n : ''}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  notes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});

export const Cell = React.memo(CellBase);
