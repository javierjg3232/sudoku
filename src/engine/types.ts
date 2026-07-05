export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert',
};

/** Number of pre-filled cells (clues) per difficulty. */
export const DIFFICULTY_GIVENS: Record<Difficulty, number> = {
  easy: 42,
  medium: 34,
  hard: 30,
  expert: 25,
};

/** A board is a flat array of 81 cells; 0 means empty. */
export type Board = number[];

export const BOARD_SIZE = 81;
export const SIZE = 9;
export const BOX = 3;

export const rowOf = (i: number): number => Math.floor(i / SIZE);
export const colOf = (i: number): number => i % SIZE;
export const boxOf = (i: number): number =>
  Math.floor(rowOf(i) / BOX) * BOX + Math.floor(colOf(i) / BOX);
export const indexOf = (row: number, col: number): number => row * SIZE + col;
