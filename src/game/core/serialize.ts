// src/game/core/serialize.ts
import type { GameState } from './types';
import { cloneGrid } from './grid';

export type SavePayload = {
  v: 1;
  state: {
    size: number;
    target: number;
    grid: number[][];
    score: number;
    best: number;
    moveCount: number;
    won: boolean;
    over: boolean;
    rngSeed: number;
    rngState: number;
    canUndo: boolean;
    prev?: {
      grid: number[][];
      score: number;
      rngState: number;
    }
  };
};

export function serialize(state: GameState): SavePayload {
  return {
    v: 1,
    state: {
      size: state.size,
      target: state.target,
      grid: cloneGrid(state.grid),
      score: state.score,
      best: state.best,
      moveCount: state.moveCount,
      won: state.won,
      over: state.over,
      rngSeed: state.rngSeed,
      rngState: state.rngState,
      canUndo: state.canUndo,
      prev: state.prev
        ? {
            grid: cloneGrid(state.prev.grid),
            score: state.prev.score,
            rngState: state.prev.rngState,
          }
        : undefined,
    },
  };
}

export function deserialize(payload: unknown): GameState | null {
  try {
    const p = payload as SavePayload;
    if (!p || p.v !== 1 || !p.state) return null;
    const s = p.state;
    // minimal shape validation
    if (!Array.isArray(s.grid) || typeof s.size !== 'number' || typeof s.target !== 'number') {
      return null;
    }
    const state: GameState = {
      size: s.size,
      target: s.target,
      grid: s.grid.map(r => r.slice()),
      score: s.score ?? 0,
      best: s.best ?? 0,
      moveCount: s.moveCount ?? 0,
      won: !!s.won,
      over: !!s.over,
      rngSeed: s.rngSeed >>> 0,
      rngState: s.rngState >>> 0,
      canUndo: !!s.canUndo,
      prev: s.prev
        ? {
            grid: s.prev.grid.map(r => r.slice()),
            score: s.prev.score ?? 0,
            rngState: s.prev.rngState >>> 0,
          }
        : undefined,
    };
    return state;
  } catch {
    return null;
  }
}
