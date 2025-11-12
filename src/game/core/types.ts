// src/game/core/types.ts

/** A square grid of base-2 exponents (0 = empty, e.g. 2^0 not used; we store raw tile values). */
export type Grid = number[][];

export enum MoveDir {
  Up = 'up',
  Down = 'down',
  Left = 'left',
  Right = 'right',
}

export interface SpawnRule {
  /** Probability for spawning a 2-tile (remaining probability spawns a 4). Default 0.9 */
  twoProb: number;
}

export type Snapshot = {
  grid: Grid;
  score: number;
  rngState: number;
};

export interface GameState {
  size: number;            // e.g. 4
  target: number;          // e.g. 2048
  grid: Grid;              // 0 means empty
  score: number;
  best: number;
  moveCount: number;
  won: boolean;
  over: boolean;

  // PRNG (mulberry32) tracked as a single uint32 state for reproducible spawns.
  rngSeed: number;
  rngState: number;

  // Undo
  canUndo: boolean;
  prev?: Snapshot;
}

export interface NewGameParams {
  size?: number;           // default 4
  target?: number;         // default 2048
  seed?: number;           // default Date.now()
  best?: number;           // default 0
  spawnRule?: SpawnRule;   // default { twoProb: 0.9 }
}
