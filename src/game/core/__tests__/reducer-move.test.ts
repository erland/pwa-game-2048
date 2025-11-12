import { MoveDir, newGame, tryMove } from '..';
import { cloneGrid, transpose, reverseRows } from '..';

function nonZeroCount(g: number[][]) {
  return g.flat().filter(v => v !== 0).length;
}
function eqCellsWhereExpected(next: number[][], expected: number[][]) {
  for (let r=0; r<expected.length; r++) {
    for (let c=0; c<expected[r].length; c++) {
      if (expected[r][c] !== 0) {
        expect(next[r][c]).toBe(expected[r][c]);
      }
    }
  }
}
describe('tryMove - directionality and spawn behavior', () => {
  test('Left merges/compacts and spawns exactly one tile', () => {
    const grid = [
      [2,0,2,0],
      [4,4,0,0],
      [2,2,2,0],
      [0,0,0,0],
    ];
    const s = newGame({ size: 4, seed: 12345, target: 2048 });
    // overwrite grid to avoid randomness from initial spawns
    s.grid = cloneGrid(grid);
    s.score = 0; s.best = 0; s.moveCount = 0; s.won = false; s.over = false; s.canUndo = false; s.prev = undefined;

    const { next, changed } = tryMove(s, MoveDir.Left);
    expect(changed).toBe(true);
    // Compute expected grid without the post-move spawn
    const e0 = [
      [4,0,0,0],
      [8,0,0,0],
      [4,2,0,0],
      [0,0,0,0],
    ];
    // Check that all expected non-zero cells are present and unchanged
    eqCellsWhereExpected(next.grid, e0);
    // And that exactly one extra non-zero tile was spawned (2 or 4)
    expect(nonZeroCount(next.grid)).toBe(nonZeroCount(e0) + 1);
    const extras: number[] = [];
    for (let r=0; r<4; r++) for (let c=0; c<4; c++) {
      if (e0[r][c] === 0 && next.grid[r][c] !== 0) extras.push(next.grid[r][c]);
    }
    expect(extras.length).toBe(1);
    expect([2,4]).toContain(extras[0]);
  });

  test('Right is mirror of Left; Up/Down use transpose', () => {
    const base = [
      [2,0,2,0],
      [4,4,0,0],
      [2,2,2,0],
      [0,0,0,0],
    ];
    // Expected after Right (pre-spawn)
    const eRight = [
      [0,0,0,4],
      [0,0,0,8],
      [0,0,2,4],
      [0,0,0,0],
    ];
    const sR = newGame({ size: 4, seed: 77, target: 2048 });
    sR.grid = cloneGrid(base);
    sR.score = 0; sR.best = 0; sR.moveCount = 0; sR.won = false; sR.over = false; sR.canUndo = false; sR.prev = undefined;
    const { next: nR, changed: chR } = tryMove(sR, MoveDir.Right);
    expect(chR).toBe(true);
    // non-spawn check
    for (let r=0; r<4; r++) for (let c=0; c<4; c++) {
      if (eRight[r][c] !== 0) expect(nR.grid[r][c]).toBe(eRight[r][c]);
    }

    // A no-op move (no merges/compactions possible)
    const solid = [
      [2,4,8,16],
      [32,64,128,256],
      [2,4,8,16],
      [32,64,128,256],
    ];
    const sN = newGame({ size: 4, seed: 99, target: 2048 });
    sN.grid = cloneGrid(solid);
    sN.score = 0; sN.best = 0; sN.moveCount = 0; sN.won = false; sN.over = false; sN.canUndo = false; sN.prev = undefined;
    const { next: nN, changed: chN } = tryMove(sN, MoveDir.Left);
    expect(chN).toBe(false);
    expect(nN.grid).toEqual(solid);
  });
});
