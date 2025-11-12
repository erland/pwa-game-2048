// src/game/core/reducer.ts
import { MoveDir, type GameState, type Grid, type NewGameParams, type SpawnRule, type Snapshot } from './types';
import { makeGrid, cloneGrid, transpose, reverseRows, emptyCells, equalGrid } from './grid';
import { slideAndMerge } from './merge';
import { normalizeSeed, nextInt, chance } from './rng';

const DEFAULT_SPAWN: SpawnRule = { twoProb: 0.9 };

export type MoveCell = { r: number; c: number };
export type MoveDiff = {
  from: MoveCell;
  to: MoveCell;
  value: number;
  merged?: boolean;      // this mover disappears into survivor
  survivor?: boolean;    // this mover becomes the resulting tile
  newValue?: number;     // only set on survivor when merged
};

/** For UI: plan a move without mutating state.
 * Returns whether the grid changes, the grid after compaction+merge (pre-spawn),
 * the list of per-tile movements/merges, and the gained score (for effects).
 */
export function planMove(state: GameState, dir: MoveDir): {
  changed: boolean;
  gridAfterMove: Grid;
  diffs: MoveDiff[];
  gainedScore: number;
} {
  const n = state.size;
  const src = state.grid;
  const out = makeGrid(n);
  const diffs: MoveDiff[] = [];
  let totalScore = 0;

  // Helper to get the ordered list of cell coordinates for a line, in the processing order
  const lineCoords = (dir: MoveDir, line: number): MoveCell[] => {
    const cells: MoveCell[] = [];
    if (dir === MoveDir.Left) {
      for (let c=0;c<n;c++) cells.push({ r: line, c });
    } else if (dir === MoveDir.Right) {
      for (let c=n-1;c>=0;c--) cells.push({ r: line, c });
    } else if (dir === MoveDir.Up) {
      for (let r=0;r<n;r++) cells.push({ r, c: line });
    } else { // Down
      for (let r=n-1;r>=0;r--) cells.push({ r, c: line });
    }
    return cells;
  };

  for (let line=0; line<n; line++) {
    const cells = lineCoords(dir, line);
    const nonZero: { idx: number; pos: MoveCell; val: number }[] = [];
    for (let i=0;i<n;i++) {
      const {r,c} = cells[i];
      const v = src[r][c];
      if (v !== 0) nonZero.push({ idx: i, pos: {r,c}, val: v });
    }
    // Build merged outputs in processing order
    const outputs: { val: number; srcs: { idx: number; pos: MoveCell; val: number }[]; merged: boolean }[] = [];
    for (let i=0;i<nonZero.length;i++) {
      const cur = nonZero[i];
      const next = nonZero[i+1];
      if (next && next.val === cur.val) {
        outputs.push({ val: cur.val * 2, srcs: [cur, next], merged: true });
        totalScore += cur.val * 2;
        i += 1;
      } else {
        outputs.push({ val: cur.val, srcs: [cur], merged: false });
      }
    }
    // Write outputs into out grid and build diffs
    for (let k=0; k<outputs.length; k++) {
      const dest = cells[k]; // k-th slot in processing order
      const o = outputs[k];
      out[dest.r][dest.c] = o.val;
      if (o.srcs.length === 1) {
        const s = o.srcs[0];
        diffs.push({ from: s.pos, to: dest, value: s.val });
      } else {
        // two sources; choose first as survivor
        const [a,b] = o.srcs;
        diffs.push({ from: a.pos, to: dest, value: a.val, survivor: true, newValue: o.val });
        diffs.push({ from: b.pos, to: dest, value: b.val, merged: true });
      }
    }
  }

  const changed = !equalGrid(src, out);
  return { changed, gridAfterMove: out, diffs, gainedScore: totalScore };
}


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
