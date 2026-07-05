import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generatePuzzle, isSolved, isValid } from '../engine/sudoku';
import { generateDailyPuzzle, DAILY_DIFFICULTY } from '../engine/daily';
import {
  Board,
  BOARD_SIZE,
  Difficulty,
  DIFFICULTIES,
  SIZE,
  BOX,
  rowOf,
  colOf,
} from '../engine/types';
import { hapticTap, hapticError, hapticSuccess } from '../utils/haptics';
import { dateKey, previousDateKey } from '../utils/date';

const GAME_KEY = 'sudoko:current-game';
const STATS_KEY = 'sudoko:stats';
const SETTINGS_KEY = 'sudoko:settings';

export const MISTAKE_LIMIT = 3;
export const HINT_LIMIT = 3;

export type GameStatus = 'playing' | 'won' | 'lost';

interface Snapshot {
  values: Board;
  notes: number[][];
  mistakes: number;
}

export interface GameState {
  difficulty: Difficulty;
  puzzle: Board; // original clue layout (0 = blank)
  solution: Board; // unique completed grid
  given: boolean[]; // true where the cell is a fixed clue
  values: Board; // current player values
  notes: number[][]; // candidate notes per cell
  selectedIndex: number | null;
  notesMode: boolean;
  mistakes: number;
  hintsUsed: number; // capped at HINT_LIMIT per game; not refunded by undo
  elapsedSeconds: number;
  status: GameStatus;
  paused: boolean;
  isDaily: boolean;
  dailyKey: string | null; // date key when isDaily
  limitMistakes: boolean; // lose after MISTAKE_LIMIT wrong entries
  undoStack: Snapshot[];
  initialized: boolean;

  newGame: (difficulty: Difficulty) => void;
  newDailyGame: () => void;
  selectCell: (i: number) => void;
  inputNumber: (n: number) => void;
  erase: () => void;
  toggleNotes: () => void;
  autoNotes: () => void;
  hint: () => void;
  undo: () => void;
  tick: () => void;
  setPaused: (paused: boolean) => void;
  setLimitMistakes: (v: boolean) => void;
  loadFromStorage: () => Promise<boolean>;
  loadSettings: () => Promise<void>;
}

export interface DifficultyStat {
  started: number;
  completions: number;
  bestTimeSeconds: number | null;
  totalTimeSeconds: number; // across completions, for average time
}
export interface DailyStat {
  lastCompletedKey: string | null;
  streak: number;
  bestStreak: number;
}
export interface Stats {
  byDifficulty: Record<Difficulty, DifficultyStat>;
  daily: DailyStat;
}

const emptyDifficultyStat = (): DifficultyStat => ({
  started: 0,
  completions: 0,
  bestTimeSeconds: null,
  totalTimeSeconds: 0,
});

export const emptyStats = (): Stats => ({
  byDifficulty: {
    easy: emptyDifficultyStat(),
    medium: emptyDifficultyStat(),
    hard: emptyDifficultyStat(),
    expert: emptyDifficultyStat(),
  },
  daily: { lastCompletedKey: null, streak: 0, bestStreak: 0 },
});

/** Flat indices that share a row, column or box with `i` (excluding `i`). */
export function peersOf(i: number): number[] {
  const row = rowOf(i);
  const col = colOf(i);
  const boxRow = Math.floor(row / BOX) * BOX;
  const boxCol = Math.floor(col / BOX) * BOX;
  const peers = new Set<number>();
  for (let k = 0; k < SIZE; k++) {
    peers.add(row * SIZE + k);
    peers.add(k * SIZE + col);
  }
  for (let r = 0; r < BOX; r++) {
    for (let c = 0; c < BOX; c++) {
      peers.add((boxRow + r) * SIZE + (boxCol + c));
    }
  }
  peers.delete(i);
  return [...peers];
}

function snapshot(s: GameState): Snapshot {
  return {
    values: s.values.slice(),
    notes: s.notes.map((n) => n.slice()),
    mistakes: s.mistakes,
  };
}

async function persistGame(s: GameState): Promise<void> {
  try {
    await AsyncStorage.setItem(
      GAME_KEY,
      JSON.stringify({
        difficulty: s.difficulty,
        puzzle: s.puzzle,
        solution: s.solution,
        given: s.given,
        values: s.values,
        notes: s.notes,
        mistakes: s.mistakes,
        hintsUsed: s.hintsUsed,
        elapsedSeconds: s.elapsedSeconds,
        status: s.status,
        isDaily: s.isDaily,
        dailyKey: s.dailyKey,
      })
    );
  } catch {
    // best-effort persistence
  }
}

export async function clearSavedGame(): Promise<void> {
  try {
    await AsyncStorage.removeItem(GAME_KEY);
  } catch {
    // ignore
  }
}

export async function hasSavedGame(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(GAME_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    return data?.status === 'playing';
  } catch {
    return false;
  }
}

/** Migrate/merge whatever shape is on disk into the current Stats shape. */
function mergeStats(saved: unknown): Stats {
  const stats = emptyStats();
  if (!saved || typeof saved !== 'object') return stats;
  const anySaved = saved as Record<string, unknown>;

  // Legacy shape (v1): { easy: {completions, bestTimeSeconds}, ... } at the root.
  const source = (anySaved.byDifficulty ?? anySaved) as Record<string, unknown>;
  for (const d of DIFFICULTIES) {
    const entry = source?.[d];
    if (entry && typeof entry === 'object') {
      stats.byDifficulty[d] = { ...emptyDifficultyStat(), ...(entry as object) };
    }
  }
  if (anySaved.daily && typeof anySaved.daily === 'object') {
    stats.daily = { ...stats.daily, ...(anySaved.daily as object) };
  }
  return stats;
}

export async function loadStats(): Promise<Stats> {
  try {
    const raw = await AsyncStorage.getItem(STATS_KEY);
    if (!raw) return emptyStats();
    return mergeStats(JSON.parse(raw));
  } catch {
    return emptyStats();
  }
}

async function saveStats(stats: Stats): Promise<void> {
  try {
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

async function recordStart(difficulty: Difficulty): Promise<void> {
  const stats = await loadStats();
  stats.byDifficulty[difficulty].started++;
  await saveStats(stats);
}

async function recordWin(
  difficulty: Difficulty,
  seconds: number,
  daily: { key: string } | null
): Promise<void> {
  const stats = await loadStats();
  const cur = stats.byDifficulty[difficulty];
  stats.byDifficulty[difficulty] = {
    ...cur,
    completions: cur.completions + 1,
    totalTimeSeconds: cur.totalTimeSeconds + seconds,
    bestTimeSeconds:
      cur.bestTimeSeconds === null ? seconds : Math.min(cur.bestTimeSeconds, seconds),
  };
  if (daily && stats.daily.lastCompletedKey !== daily.key) {
    const continues = stats.daily.lastCompletedKey === previousDateKey(daily.key);
    const streak = continues ? stats.daily.streak + 1 : 1;
    stats.daily = {
      lastCompletedKey: daily.key,
      streak,
      bestStreak: Math.max(stats.daily.bestStreak, streak),
    };
  }
  await saveStats(stats);
}

/** True when the parsed save file has the shape we expect. */
function isValidSave(d: unknown): d is {
  difficulty: Difficulty;
  puzzle: Board;
  solution: Board;
  given: boolean[];
  values: Board;
  notes: number[][];
  mistakes?: number;
  hintsUsed?: number;
  elapsedSeconds?: number;
  status: string;
  isDaily?: boolean;
  dailyKey?: string | null;
} {
  if (!d || typeof d !== 'object') return false;
  const s = d as Record<string, unknown>;
  const board81 = (a: unknown): boolean =>
    Array.isArray(a) && a.length === BOARD_SIZE && a.every((v) => typeof v === 'number');
  return (
    DIFFICULTIES.includes(s.difficulty as Difficulty) &&
    board81(s.puzzle) &&
    board81(s.solution) &&
    Array.isArray(s.given) &&
    s.given.length === BOARD_SIZE &&
    Array.isArray(s.notes) &&
    s.notes.length === BOARD_SIZE &&
    (s.notes as unknown[]).every((n) => Array.isArray(n)) &&
    board81(s.values)
  );
}

/** Recompute the state produced by placing/winning; shared by inputNumber and hint. */
function resolveWin(
  s: GameState,
  values: Board
): { status: GameStatus; won: boolean } {
  const won = isSolved(values);
  return { status: won ? 'won' : 'playing', won };
}

export const useGameStore = create<GameState>((set, get) => ({
  difficulty: 'easy',
  puzzle: new Array(BOARD_SIZE).fill(0),
  solution: new Array(BOARD_SIZE).fill(0),
  given: new Array(BOARD_SIZE).fill(false),
  values: new Array(BOARD_SIZE).fill(0),
  notes: Array.from({ length: BOARD_SIZE }, () => []),
  selectedIndex: null,
  notesMode: false,
  mistakes: 0,
  hintsUsed: 0,
  elapsedSeconds: 0,
  status: 'playing',
  paused: false,
  isDaily: false,
  dailyKey: null,
  limitMistakes: false,
  undoStack: [],
  initialized: false,

  newGame: (difficulty) => {
    const { puzzle, solution } = generatePuzzle(difficulty);
    set({
      difficulty,
      puzzle,
      solution,
      given: puzzle.map((v) => v !== 0),
      values: puzzle.slice(),
      notes: Array.from({ length: BOARD_SIZE }, () => []),
      selectedIndex: null,
      notesMode: false,
      mistakes: 0,
      hintsUsed: 0,
      elapsedSeconds: 0,
      status: 'playing',
      paused: false,
      isDaily: false,
      dailyKey: null,
      undoStack: [],
      initialized: true,
    });
    persistGame(get());
    recordStart(difficulty);
  },

  newDailyGame: () => {
    const key = dateKey();
    const { puzzle, solution } = generateDailyPuzzle(key);
    set({
      difficulty: DAILY_DIFFICULTY,
      puzzle,
      solution,
      given: puzzle.map((v) => v !== 0),
      values: puzzle.slice(),
      notes: Array.from({ length: BOARD_SIZE }, () => []),
      selectedIndex: null,
      notesMode: false,
      mistakes: 0,
      hintsUsed: 0,
      elapsedSeconds: 0,
      status: 'playing',
      paused: false,
      isDaily: true,
      dailyKey: key,
      undoStack: [],
      initialized: true,
    });
    persistGame(get());
    recordStart(DAILY_DIFFICULTY);
  },

  selectCell: (i) => set({ selectedIndex: i }),

  toggleNotes: () => set((s) => ({ notesMode: !s.notesMode })),

  autoNotes: () => {
    const s = get();
    const i = s.selectedIndex;
    if (s.status !== 'playing' || s.paused) return;
    if (i === null || s.given[i] || s.values[i] !== 0) return;
    const undoStack = [...s.undoStack, snapshot(s)].slice(-50);
    const notes = s.notes.map((arr) => arr.slice());
    const candidates: number[] = [];
    for (let v = 1; v <= SIZE; v++) {
      if (isValid(s.values, i, v)) candidates.push(v);
    }
    notes[i] = candidates;
    hapticTap();
    set({ notes, undoStack });
    persistGame(get());
  },

  inputNumber: (n) => {
    const s = get();
    const i = s.selectedIndex;
    if (i === null || s.given[i] || s.status !== 'playing' || s.paused) return;

    const undoStack = [...s.undoStack, snapshot(s)].slice(-50);

    if (s.notesMode) {
      if (s.values[i] !== 0) return; // can't note over a placed value
      const notes = s.notes.map((arr) => arr.slice());
      const cell = notes[i];
      const at = cell.indexOf(n);
      if (at >= 0) cell.splice(at, 1);
      else {
        cell.push(n);
        cell.sort((a, b) => a - b);
      }
      hapticTap();
      set({ notes, undoStack });
      persistGame(get());
      return;
    }

    // Place / clear a value.
    const values = s.values.slice();
    const notes = s.notes.map((arr) => arr.slice());
    if (values[i] === n) {
      values[i] = 0; // tapping the same number clears it
    } else {
      values[i] = n;
      notes[i] = [];
      // Tidy: remove this candidate from peers.
      for (const p of peersOf(i)) {
        const idx = notes[p].indexOf(n);
        if (idx >= 0) notes[p].splice(idx, 1);
      }
    }

    const wrong = values[i] !== 0 && values[i] !== s.solution[i];
    const mistakes = wrong ? s.mistakes + 1 : s.mistakes;
    const lost = wrong && s.limitMistakes && mistakes >= MISTAKE_LIMIT;

    const { status, won } = lost
      ? { status: 'lost' as GameStatus, won: false }
      : resolveWin(s, values);

    if (won) hapticSuccess();
    else if (wrong) hapticError();
    else hapticTap();

    set({ values, notes, mistakes, undoStack, status });
    persistGame(get());
    if (won) {
      recordWin(s.difficulty, get().elapsedSeconds, s.isDaily && s.dailyKey ? { key: s.dailyKey } : null);
      clearSavedGame();
    } else if (lost) {
      clearSavedGame();
    }
  },

  erase: () => {
    const s = get();
    const i = s.selectedIndex;
    if (i === null || s.given[i] || s.status !== 'playing' || s.paused) return;
    if (s.values[i] === 0 && s.notes[i].length === 0) return;
    const undoStack = [...s.undoStack, snapshot(s)].slice(-50);
    const values = s.values.slice();
    const notes = s.notes.map((arr) => arr.slice());
    values[i] = 0;
    notes[i] = [];
    hapticTap();
    set({ values, notes, undoStack });
    persistGame(get());
  },

  hint: () => {
    const s = get();
    if (s.status !== 'playing' || s.paused || s.hintsUsed >= HINT_LIMIT) return;
    // Reveal the selected empty cell, else the first empty cell.
    let target = s.selectedIndex;
    if (target === null || s.values[target] === s.solution[target]) {
      target = s.values.findIndex((v, idx) => v !== s.solution[idx]);
    }
    if (target === -1 || target === null) return;
    const undoStack = [...s.undoStack, snapshot(s)].slice(-50);
    const values = s.values.slice();
    const notes = s.notes.map((arr) => arr.slice());
    values[target] = s.solution[target];
    notes[target] = [];
    for (const p of peersOf(target)) {
      const idx = notes[p].indexOf(values[target]);
      if (idx >= 0) notes[p].splice(idx, 1);
    }
    const { status, won } = resolveWin(s, values);
    if (won) hapticSuccess();
    else hapticTap();
    set({
      values,
      notes,
      selectedIndex: target,
      undoStack,
      status,
      hintsUsed: s.hintsUsed + 1,
    });
    persistGame(get());
    if (won) {
      recordWin(s.difficulty, get().elapsedSeconds, s.isDaily && s.dailyKey ? { key: s.dailyKey } : null);
      clearSavedGame();
    }
  },

  undo: () => {
    const s = get();
    // Won and lost are both final — undo must not resurrect a finished game.
    if (s.undoStack.length === 0 || s.status !== 'playing') return;
    const prev = s.undoStack[s.undoStack.length - 1];
    set({
      values: prev.values.slice(),
      notes: prev.notes.map((n) => n.slice()),
      mistakes: prev.mistakes,
      undoStack: s.undoStack.slice(0, -1),
    });
    persistGame(get());
  },

  tick: () => {
    const s = get();
    if (s.status !== 'playing' || s.paused || !s.initialized) return;
    set({ elapsedSeconds: s.elapsedSeconds + 1 });
    // Persist time periodically to avoid excessive writes.
    if ((s.elapsedSeconds + 1) % 5 === 0) persistGame(get());
  },

  setPaused: (paused) => {
    const s = get();
    if (s.status !== 'playing') return;
    set({ paused });
    if (paused) persistGame(get()); // capture the exact time when pausing
  },

  setLimitMistakes: (v) => {
    set({ limitMistakes: v });
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ limitMistakes: v })).catch(
      () => {}
    );
  },

  loadSettings: async () => {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (typeof d?.limitMistakes === 'boolean') set({ limitMistakes: d.limitMistakes });
    } catch {
      // ignore
    }
  },

  loadFromStorage: async () => {
    try {
      const raw = await AsyncStorage.getItem(GAME_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (d?.status !== 'playing' || !isValidSave(d)) return false;
      set({
        difficulty: d.difficulty,
        puzzle: d.puzzle,
        solution: d.solution,
        given: d.given,
        values: d.values,
        notes: d.notes,
        mistakes: d.mistakes ?? 0,
        hintsUsed: d.hintsUsed ?? 0,
        elapsedSeconds: d.elapsedSeconds ?? 0,
        status: 'playing',
        paused: false,
        isDaily: d.isDaily ?? false,
        dailyKey: d.dailyKey ?? null,
        selectedIndex: null,
        notesMode: false,
        undoStack: [],
        initialized: true,
      });
      return true;
    } catch {
      return false;
    }
  },
}));
