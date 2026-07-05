import {
  Board,
  BOARD_SIZE,
  SIZE,
  BOX,
  Difficulty,
  DIFFICULTY_GIVENS,
} from './types';
import { Rng } from './rng';

/** Fisher–Yates shuffle (returns a new array). */
function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Whether `val` can legally be placed at flat index `i` on `board`,
 * checking the row, column and 3x3 box (ignoring the cell itself).
 */
export function isValid(board: Board, i: number, val: number): boolean {
  const row = Math.floor(i / SIZE);
  const col = i % SIZE;
  const boxRow = Math.floor(row / BOX) * BOX;
  const boxCol = Math.floor(col / BOX) * BOX;

  for (let k = 0; k < SIZE; k++) {
    if (board[row * SIZE + k] === val && row * SIZE + k !== i) return false; // row
    if (board[k * SIZE + col] === val && k * SIZE + col !== i) return false; // col
  }
  for (let r = 0; r < BOX; r++) {
    for (let c = 0; c < BOX; c++) {
      const idx = (boxRow + r) * SIZE + (boxCol + c);
      if (board[idx] === val && idx !== i) return false; // box
    }
  }
  return true;
}

/** Fill an empty board with a complete, valid solution via randomized backtracking. */
export function generateSolved(rng: Rng = Math.random): Board {
  const board: Board = new Array(BOARD_SIZE).fill(0);

  const fill = (pos: number): boolean => {
    if (pos === BOARD_SIZE) return true;
    if (board[pos] !== 0) return fill(pos + 1);
    for (const val of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng)) {
      if (isValid(board, pos, val)) {
        board[pos] = val;
        if (fill(pos + 1)) return true;
        board[pos] = 0;
      }
    }
    return false;
  };

  fill(0);
  return board;
}

/**
 * Count solutions of `board`, short-circuiting once `limit` is reached.
 * Used both to solve and to verify a puzzle has a unique solution.
 */
export function countSolutions(board: Board, limit = 2): number {
  const work = board.slice();
  let count = 0;

  const solve = (): void => {
    if (count >= limit) return;
    // Find the empty cell with the fewest candidates (MRV) to prune fast.
    let best = -1;
    let bestCandidates: number[] | null = null;
    for (let i = 0; i < BOARD_SIZE; i++) {
      if (work[i] !== 0) continue;
      const candidates: number[] = [];
      for (let v = 1; v <= SIZE; v++) {
        if (isValid(work, i, v)) candidates.push(v);
      }
      if (candidates.length === 0) return; // dead end
      if (bestCandidates === null || candidates.length < bestCandidates.length) {
        best = i;
        bestCandidates = candidates;
        if (candidates.length === 1) break;
      }
    }
    if (best === -1) {
      count++; // no empty cells -> a full solution
      return;
    }
    for (const v of bestCandidates!) {
      work[best] = v;
      solve();
      work[best] = 0;
      if (count >= limit) return;
    }
  };

  solve();
  return count;
}

/** Solve a board (returns a filled copy, or null if unsolvable). */
export function solve(board: Board): Board | null {
  const work = board.slice();

  const go = (): boolean => {
    let pos = -1;
    for (let i = 0; i < BOARD_SIZE; i++) {
      if (work[i] === 0) {
        pos = i;
        break;
      }
    }
    if (pos === -1) return true;
    for (let v = 1; v <= SIZE; v++) {
      if (isValid(work, pos, v)) {
        work[pos] = v;
        if (go()) return true;
        work[pos] = 0;
      }
    }
    return false;
  };

  return go() ? work : null;
}

export interface GeneratedPuzzle {
  puzzle: Board; // with blanks (0)
  solution: Board; // the unique completed grid
}

/**
 * Generate a puzzle for the given difficulty. Starts from a full solution and
 * removes cells (symmetric pairs) as long as the puzzle keeps a unique solution,
 * down to the target number of clues.
 */
export function generatePuzzle(
  difficulty: Difficulty,
  rng: Rng = Math.random
): GeneratedPuzzle {
  const solution = generateSolved(rng);
  const puzzle = solution.slice();
  const targetGivens = DIFFICULTY_GIVENS[difficulty];

  const positions = shuffle(
    Array.from({ length: BOARD_SIZE }, (_, i) => i),
    rng
  );
  let givens = BOARD_SIZE;

  for (const i of positions) {
    if (givens <= targetGivens) break;
    // Remove a symmetric pair (180° rotation) for an aesthetic, balanced puzzle.
    const mirror = BOARD_SIZE - 1 - i;
    const removed: Array<[number, number]> = [];
    for (const idx of mirror === i ? [i] : [i, mirror]) {
      if (puzzle[idx] !== 0) {
        removed.push([idx, puzzle[idx]]);
        puzzle[idx] = 0;
      }
    }
    if (removed.length === 0) continue;

    if (countSolutions(puzzle, 2) !== 1) {
      // Removing these broke uniqueness — put them back.
      for (const [idx, val] of removed) puzzle[idx] = val;
    } else {
      givens -= removed.length;
    }
  }

  return { puzzle, solution };
}

/** True when every cell is filled and the board is a valid solution. */
export function isSolved(board: Board): boolean {
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (board[i] === 0) return false;
    if (!isValid(board, i, board[i])) return false;
  }
  return true;
}

/** Flat indices that conflict with at least one peer (same row/col/box, same value). */
export function findConflicts(board: Board): Set<number> {
  const conflicts = new Set<number>();
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (board[i] !== 0 && !isValid(board, i, board[i])) {
      conflicts.add(i);
    }
  }
  return conflicts;
}
