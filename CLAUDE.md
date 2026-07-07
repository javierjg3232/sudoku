# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start              # Expo dev server (press i / a / w for iOS / Android / web)
npm run web            # Run directly in the browser
npm run typecheck      # tsc --noEmit
npm run test:engine    # Compile + run the engine sanity check (puzzle uniqueness)
```

There is no unit-test runner or linter configured. `test:engine` is the only automated
check beyond `typecheck`: it transpiles the pure engine to `.engine-build/` with `tsc` and
asserts every generated puzzle is uniquely solvable. Run both `typecheck` and `test:engine`
after touching the engine.

To preview locally, the web target is the fastest path (`npm run web`); `.claude/launch.json`
defines a `web` server on port 8081 for the preview tooling. Metro's first web bundle is slow
(~80s) — let it finish before screenshotting.

## Architecture

Expo Router app (SDK 54, React 19, TypeScript). Three layers, strictly separated.
Note: `babel-preset-expo` must remain an explicit dependency (`babel.config.js`
references it; SDK 54's tree no longer hoists it transitively — Metro fails with a
TransformError 500 if it's missing) **and** it must be the SDK-matched version — install
it with `npx expo install babel-preset-expo`, never `npm install` (a newer major targets
a different Hermes and causes `SyntaxError: private properties are not supported` in
Expo Go). The preset is configured with `unstable_transformImportMeta: true` in
`babel.config.js` — zustand's ESM build uses `import.meta`, which otherwise breaks the
web bundle at parse time (blank page, no console errors).

**`src/engine/`** — pure, framework-free Sudoku logic. No React, no storage imports.
- `sudoku.ts`: `generateSolved` (randomized backtracking), `generatePuzzle(difficulty, rng?)`,
  `solve`, `countSolutions`, `isValid`, `isSolved`, `findConflicts`.
- Generators take an optional `Rng` (defaults to `Math.random`). `rng.ts` provides
  `mulberry32` + `seedFromString`; `daily.ts` uses them so `generateDailyPuzzle(dateKey)` is
  **deterministic across devices** — same date, same board. `test:engine` asserts this;
  don't introduce unseeded randomness into the generation path.
- The board model is a **flat `number[]` of length 81** (0 = empty), not a 2D grid. Use the
  `rowOf/colOf/boxOf/indexOf` helpers in `types.ts` for coordinate math.
- `generatePuzzle` removes cells in **180°-symmetric pairs**, keeping a removal only if
  `countSolutions(puzzle, 2) === 1`. This guarantees a unique solution but means the final
  clue count can land a few above the difficulty target (e.g. Expert ~28 vs target 25) — this
  is intentional, not a bug. Difficulty targets live in `DIFFICULTY_GIVENS` (`types.ts`).
- `countSolutions` uses MRV (fewest-candidates-first) ordering with an early exit at `limit`,
  so uniqueness checks during generation stay fast.

**`src/store/gameStore.ts`** — single Zustand store; the only source of game truth.
- Mutating actions (`inputNumber`, `erase`, `hint`, `undo`, `autoNotes`) push a snapshot onto
  `undoStack` and call `persistGame(get())` to auto-save to AsyncStorage on every change.
  All gameplay actions no-op when `paused` or `status !== 'playing'`.
- `status` is `'playing' | 'won' | 'lost'`. Losing only happens when `limitMistakes` is on
  and `mistakes` reaches `MISTAKE_LIMIT` (3). Both win and loss clear the saved game; only a
  win records stats.
- `hint` is capped at `HINT_LIMIT` (3) per game via `hintsUsed`, which is deliberately
  **not** part of undo snapshots — undoing a hint restores the board but keeps the hint
  spent. `autoNotes` fills candidates for the selected cell only.
- `inputNumber` compares against `solution` to flag wrong entries / increment `mistakes`, and
  tidies the placed digit out of peer notes (`peersOf`). Notes are stored as `number[][]`
  (per-cell sorted arrays) for serializability — not `Set`s.
- Store actions call the haptics wrappers in `src/utils/haptics.ts` (no-ops on web) — keep
  haptic feedback there, not in components.
- Persistence helpers live alongside the store as plain functions: `hasSavedGame`,
  `loadStats`, `clearSavedGame`. Only a `status: 'playing'` game counts as resumable, and
  `loadFromStorage` validates the saved shape (`isValidSave`) before hydrating. Storage keys:
  `sudoko:current-game`, `sudoko:stats`, `sudoko:settings` (and `sudoko:theme-preference` in
  the theme provider).
- Stats shape is `{ byDifficulty: { started, completions, bestTimeSeconds,
  totalTimeSeconds }, daily: { lastCompletedKey, streak, bestStreak } }`. `mergeStats`
  migrates the legacy v1 layout (difficulty records at the root) — preserve that path when
  changing the shape. Daily streak math uses local-date keys from `src/utils/date.ts`.
- The timer is **not** in the store's effects — `app/game.tsx` owns a `setInterval` that calls
  `tick()` each second; `tick` no-ops unless playing, unpaused, and `initialized`.
  `game.tsx` also owns auto-pause (AppState) and the web-only keyboard handler
  (1-9 place, arrows move, N notes, U undo, H hint, P pause, Backspace erase).

**`src/theme/`** — `colors.ts` defines the two `Theme` objects (Claude cream/clay-orange
palette). `ThemeContext.tsx` provides `useTheme()`, follows the system scheme by default, and
persists a manual override. Components receive the resolved `Theme` and inline its tokens;
there is no global stylesheet — colors always come from `theme`, never hardcoded.

**`app/`** — Expo Router screens (`index` Home, `game`, `stats`) under `_layout.tsx`, which
wraps everything in `GestureHandlerRootView > SafeAreaProvider > ThemeProvider`. Navigation
between screens assumes a game already exists in the store; `game.tsx` redirects to Home if
`initialized` is false. `app.json` enables `typedRoutes`, so route strings are type-checked.

### Data flow for a move
`Cell` tap → `selectCell` → user taps `NumberPad` → `inputNumber` mutates `values`/`notes`
in the store → `Board` recomputes highlight/conflict sets from store state and re-renders →
`persistGame` writes to AsyncStorage. `Board` derives all visual state (peers, same-value,
conflicts via `findConflicts`) on each render rather than storing it.

### Component conventions
- `Cell` is `React.memo`'d and receives a **stable** `onSelect(index)` callback (the Zustand
  action passed directly) plus primitive props — do not pass inline closures from `Board`,
  it silently defeats the memo across all 81 cells.
- Interactive elements carry `accessibilityRole`/`accessibilityLabel`; cell labels follow
  `"Row R, column C, <value|notes …|empty>"`. These double as selectors for browser-based
  verification, so keep them stable.
