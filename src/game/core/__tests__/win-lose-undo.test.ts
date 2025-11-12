import { hasMoves, hasWon, newGame, tryMove, undo, MoveDir } from '..';
import { cloneGrid } from '..';

describe('win/lose detection and undo', () => {
  it('detects no-moves terminal grids', () => {
    const g = [
      [2,4,8,16],
      [32,64,128,256],
      [2,4,8,16],
      [32,64,128,256],
    ];
    expect(hasMoves(g)).toBe(false);
  });

  it('detects winning grid', () => {
    const g = [
      [0,0,0,0],
      [0,0,0,0],
      [0,0,0,0],
      [0,0,2048,0],
    ];
    expect(hasWon(g, 2048)).toBe(true);
  });

  it('undo restores grid, score and rng state', () => {
    const start = newGame({ size: 4, seed: 123, target: 2048 });
    // overwrite to a simple grid
    start.grid = cloneGrid([
      [2,2,0,0],
      [0,0,0,0],
      [0,0,0,0],
      [0,0,0,0],
    ]);
    start.score = 0; start.best = 0; start.moveCount = 0; start.won = false; start.over = false; start.canUndo = false; start.prev = undefined;
    const original = { grid: cloneGrid(start.grid), score: start.score, rngState: start.rngState };

    const moved = tryMove(start, MoveDir.Left).next;
    const undone = undo(moved);

    expect(undone.grid).toEqual(original.grid);
    expect(undone.score).toBe(original.score);
    expect(undone.rngState).toBe(original.rngState);
    expect(undone.canUndo).toBe(false);
  });
});
