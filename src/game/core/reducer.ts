// src/game/core/reducer.ts
import { MoveDir, type GameState, type Grid, type NewGameParams, type SpawnRule, type Snapshot } from './types';
import { makeGrid, cloneGrid, transpose, reverseRows, emptyCells, equalGrid } from './grid';
import { slideAndMerge } from './merge';
import { normalizeSeed, nextInt, chance } from './rng';

const DEFAULT_SPAWN: SpawnRule = { twoProb: 0.9 };

export function newGame(params: NewGameParams = {}): GameState {
  const size = params.size ?? 4;
  const target = params.target ?? 2048;
  const best = params.best ?? 0;
  const rngSeed = normalizeSeed(params.seed);
  const rngState = rngSeed;

  let state: GameState = {
    size,
    target,
    grid: makeGrid(size),
    score: 0,
    best,
    moveCount: 0,
    won: false,
    over: false,
    rngSeed,
    rngState,
    canUndo: false,
  };
  // Spawn two tiles
  state = spawnTile(state, params.spawnRule);
  state = spawnTile(state, params.spawnRule);
  recomputeFlags(state);
  return state;
}

/** Spawns a single tile (2 or 4) at a random empty cell; returns a NEW state. */
export function spawnTile(state: GameState, spawnRule?: SpawnRule): GameState {
  const rule = spawnRule ?? DEFAULT_SPAWN;
  const empties = emptyCells(state.grid);
  if (empties.length === 0) return state;

  // snapshot grid
  const g = cloneGrid(state.grid);

  let idxRes = nextInt(state.rngState, empties.length);
  const [r, c] = empties[idxRes.value];

  let probRes = chance(idxRes.state, rule.twoProb);
  const val = probRes.hit ? 2 : 4;

  g[r][c] = val;

  const next: GameState = {
    ...state,
    grid: g,
    rngState: probRes.state,
  };
  return next;
}

/** Attempts a move; returns the next state + whether anything changed. */
export function tryMove(state: GameState, dir: MoveDir, spawnRule?: SpawnRule): { next: GameState; changed: boolean } {
  const size = state.size;
  let view: Grid = state.grid;

  // Build directional view so we can reuse left-merge logic.
  if (dir === MoveDir.Up) {
    view = transpose(state.grid);
  } else if (dir === MoveDir.Down) {
    view = reverseRows(transpose(state.grid));
  } else if (dir === MoveDir.Right) {
    view = reverseRows(state.grid);
  }

  // Process each row
  let gained = 0;
  const processed: Grid = Array.from({ length: size }, (_, r) => {
    const { row, gainedScore } = slideAndMerge(view[r]);
    gained += gainedScore;
    return row;
  });

  // Undo directional transforms
  let merged: Grid = processed;
  if (dir === MoveDir.Up) {
    merged = transpose(processed);
  } else if (dir === MoveDir.Down) {
    merged = transpose(reverseRows(processed));
  } else if (dir === MoveDir.Right) {
    merged = reverseRows(processed);
  }

  const changed = !equalGrid(state.grid, merged);
  if (!changed) {
    // no-op move: don't spawn, don't consume undo
    return { next: state, changed: false };
  }

  // Prepare snapshot for undo
  const prev: Snapshot = {
    grid: state.grid,
    score: state.score,
    rngState: state.rngState,
  };

  // Commit grid + score
  let nextState: GameState = {
    ...state,
    grid: merged,
    score: state.score + gained,
    best: Math.max(state.best, state.score + gained),
    moveCount: state.moveCount + 1,
    canUndo: true,
    prev,
  };

  // Spawn one tile post-move
  nextState = spawnTile(nextState, spawnRule);

  recomputeFlags(nextState);
  return { next: nextState, changed: true };
}

export function hasWon(grid: Grid, target: number): boolean {
  for (const row of grid) {
    for (const v of row) {
      if (v >= target) return true;
    }
  }
  return false;
}

export function hasMoves(grid: Grid): boolean {
  const n = grid.length;
  // Any empties?
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (grid[r][c] === 0) return true;
    }
  }
  // Any merges possible?
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = grid[r][c];
      if (r + 1 < n && grid[r + 1][c] === v) return true;
      if (c + 1 < n && grid[r][c + 1] === v) return true;
    }
  }
  return false;
}

function recomputeFlags(state: GameState): void {
  state.won = hasWon(state.grid, state.target);
  state.over = !state.won && !hasMoves(state.grid);
}

/** Undo the last move (grid, score, rng). One-step only. */
export function undo(state: GameState): GameState {
  if (!state.canUndo || !state.prev) return state;
  const s: GameState = {
    ...state,
    grid: cloneGrid(state.prev.grid),
    score: state.prev.score,
    rngState: state.prev.rngState,
    canUndo: false,
    prev: undefined,
  };
  recomputeFlags(s);
  return s;
}
