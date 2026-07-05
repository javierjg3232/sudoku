import React, { useMemo } from 'react';
import { View, useWindowDimensions, StyleSheet } from 'react-native';
import { Cell } from './Cell';
import { useGameStore } from '../store/gameStore';
import { useTheme } from '../theme/ThemeContext';
import { BOARD_SIZE, rowOf, colOf, boxOf } from '../engine/types';
import { findConflicts } from '../engine/sudoku';

export function Board() {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();

  const values = useGameStore((s) => s.values);
  const given = useGameStore((s) => s.given);
  const notes = useGameStore((s) => s.notes);
  const solution = useGameStore((s) => s.solution);
  const selectedIndex = useGameStore((s) => s.selectedIndex);
  const selectCell = useGameStore((s) => s.selectCell);

  const boardSize = Math.min(width - 24, height * 0.55, 460);
  const cellSize = Math.floor(boardSize / 9);
  const fullSize = cellSize * 9;

  const conflicts = useMemo(() => findConflicts(values), [values]);

  const selectedRow = selectedIndex !== null ? rowOf(selectedIndex) : -1;
  const selectedCol = selectedIndex !== null ? colOf(selectedIndex) : -1;
  const selectedBox = selectedIndex !== null ? boxOf(selectedIndex) : -1;
  const selectedValue =
    selectedIndex !== null && values[selectedIndex] !== 0
      ? values[selectedIndex]
      : 0;

  return (
    <View
      style={[
        styles.board,
        {
          width: fullSize,
          height: fullSize,
          backgroundColor: theme.surface,
          shadowColor: theme.shadow,
        },
      ]}
    >
      {Array.from({ length: BOARD_SIZE }, (_, i) => {
        const r = rowOf(i);
        const c = colOf(i);
        const isPeer =
          selectedIndex !== null &&
          i !== selectedIndex &&
          (r === selectedRow || c === selectedCol || boxOf(i) === selectedBox);
        const isSameValue =
          selectedValue !== 0 && values[i] === selectedValue && i !== selectedIndex;
        const isWrong =
          values[i] !== 0 && !given[i] && values[i] !== solution[i];

        return (
          <Cell
            key={i}
            index={i}
            value={values[i]}
            given={given[i]}
            notes={notes[i]}
            size={cellSize}
            theme={theme}
            isSelected={i === selectedIndex}
            isPeer={isPeer}
            isSameValue={isSameValue}
            isConflict={conflicts.has(i)}
            isWrong={isWrong}
            onSelect={selectCell}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 8,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 3,
  },
});
