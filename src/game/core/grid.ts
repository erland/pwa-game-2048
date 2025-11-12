// src/game/core/grid.ts
import type { Grid } from './types';

export function makeGrid(size: number): Grid {
  return Array.from({ length: size }, () => Array<number>(size).fill(0));
}

export function cloneGrid(g: Grid): Grid {
  return g.map(row => row.slice());
}

export function equalGrid(a: Grid, b: Grid): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ra = a[i], rb = b[i];
    for (let j = 0; j < ra.length; j++) {
      if (ra[j] !== rb[j]) return false;
    }
  }
  return true;
}

/** Returns coordinates of empty cells as [r,c] tuples. */
export function emptyCells(g: Grid): Array<[number, number]> {
  const cells: Array<[number, number]> = [];
  for (let r = 0; r < g.length; r++) {
    const row = g[r];
    for (let c = 0; c < row.length; c++) {
      if (row[c] === 0) cells.push([r, c]);
    }
  }
  return cells;
}

export function transpose(g: Grid): Grid {
  const n = g.length;
  const out = makeGrid(n);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      out[c][r] = g[r][c];
    }
  }
  return out;
}

export function reverseRows(g: Grid): Grid {
  return g.map(row => row.slice().reverse());
}
