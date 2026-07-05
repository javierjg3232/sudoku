import { generatePuzzle, GeneratedPuzzle } from './sudoku';
import { mulberry32, seedFromString } from './rng';
import { Difficulty } from './types';

export const DAILY_DIFFICULTY: Difficulty = 'medium';

/**
 * Deterministic puzzle for a calendar day: the same dateKey ("YYYY-MM-DD")
 * yields the same board on every device.
 */
export function generateDailyPuzzle(dateKey: string): GeneratedPuzzle {
  return generatePuzzle(DAILY_DIFFICULTY, mulberry32(seedFromString(dateKey)));
}
