import { generatePuzzle, countSolutions, solve, isSolved } from '../src/engine/sudoku';
import { DIFFICULTIES, DIFFICULTY_GIVENS, BOARD_SIZE } from '../src/engine/types';
import { mulberry32, seedFromString } from '../src/engine/rng';

let failures = 0;

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error('  ✗ ' + msg);
    failures++;
  }
}

for (const d of DIFFICULTIES) {
  console.log(`Difficulty: ${d}`);
  const start = Date.now();
  const { puzzle, solution } = generatePuzzle(d);

  const givens = puzzle.filter((v) => v !== 0).length;
  const sols = countSolutions(puzzle, 2);
  const solved = solve(puzzle);

  assert(puzzle.length === BOARD_SIZE, 'puzzle has 81 cells');
  assert(isSolved(solution), 'solution is a valid complete grid');
  assert(sols === 1, `puzzle has a unique solution (got ${sols})`);
  assert(solved !== null && isSolved(solved), 'puzzle is solvable');
  assert(
    solved !== null && solved.every((v, i) => v === solution[i]),
    'solver recovers the original solution'
  );
  assert(
    givens >= DIFFICULTY_GIVENS[d] - 2 && givens <= DIFFICULTY_GIVENS[d] + 4,
    `givens (${givens}) near target ${DIFFICULTY_GIVENS[d]}`
  );

  console.log(`  givens=${givens} solutions=${sols} time=${Date.now() - start}ms`);
}

// Seeded generation must be deterministic (daily puzzle contract).
console.log('Determinism (seeded rng)');
const key = '2026-07-02';
const a = generatePuzzle('medium', mulberry32(seedFromString(key)));
const b = generatePuzzle('medium', mulberry32(seedFromString(key)));
const c = generatePuzzle('medium', mulberry32(seedFromString('2026-07-03')));
assert(
  a.puzzle.every((v, i) => v === b.puzzle[i]),
  'same seed produces the same puzzle'
);
assert(
  !a.puzzle.every((v, i) => v === c.puzzle[i]),
  'different seeds produce different puzzles'
);
console.log('  same-seed reproducible, cross-seed distinct');

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log('\nAll engine checks passed ✓');
