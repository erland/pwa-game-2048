/**
 * BoardView with TileView pooling and simple animations.
 */
import Phaser from 'phaser';
import { TileView } from './TileView';

export type BoardViewOptions = {
  rows: number;
  cols: number;
  tileSize: number;
  gap: number;
  radius?: number;
  fontFamily?: string;
};

export class BoardView extends Phaser.GameObjects.Container {
  private opts: BoardViewOptions;
  private bg!: Phaser.GameObjects.Graphics;
  private tilesLayer!: Phaser.GameObjects.Container;
  private tiles = new Map<string, TileView>(); // key = "r,c"

  constructor(scene: Phaser.Scene, opts: BoardViewOptions) {
    super(scene);
    this.opts = { ...opts };
    this.setSize(this.pixelWidth(), this.pixelHeight());

    this.bg = scene.add.graphics();
    this.tilesLayer = scene.add.container();

    this.add([this.bg, this.tilesLayer]);
    this.redrawBackground();
  }

  pixelWidth(): number {
    const { cols, tileSize, gap } = this.opts;
    return cols * tileSize + (cols + 1) * gap;
  }
  pixelHeight(): number {
    const { rows, tileSize, gap } = this.opts;
    return rows * tileSize + (rows + 1) * gap;
  }

  /** Local container coords center for a cell. */
  public cellCenter(r: number, c: number): { x: number; y: number } {
    const { tileSize, gap } = this.opts;
    const x = gap + c * (tileSize + gap) + tileSize / 2;
    const y = gap + r * (tileSize + gap) + tileSize / 2;
    return { x, y };
  }

  private colorFor(value: number): number {
    switch (value) {
      case 0:   return 0xcdc1b4; // empty slot
      case 2:   return 0xeee4da;
      case 4:   return 0xede0c8;
      case 8:   return 0xf2b179;
      case 16:  return 0xf59563;
      case 32:  return 0xf67c5f;
      case 64:  return 0xf65e3b;
      case 128: return 0xedcf72;
      case 256: return 0xedcc61;
      case 512: return 0xedc850;
      case 1024:return 0xedc53f;
      case 2048:return 0xedc22e;
      default:  return 0x3c3a32;
    }
  }
  private textColorFor(value: number): string {
    return value <= 4 ? '#776e65' : '#f9f6f2';
  }

  private redrawBackground() {
    const { radius = 12 } = this.opts;
    const w = this.pixelWidth();
    const h = this.pixelHeight();

    this.bg.clear();
    this.bg.fillStyle(0xbbada0, 1);
    this.bg.fillRoundedRect(0, 0, w, h, radius);

    // empty slots
    const { rows, cols, tileSize, gap } = this.opts;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = gap + c * (tileSize + gap);
        const y = gap + r * (tileSize + gap);
        this.bg.fillStyle(this.colorFor(0), 1);
        this.bg.fillRoundedRect(x, y, tileSize, tileSize, radius);
      }
    }
  }

  /** Hard sync all tiles to match a grid (no animations). */
  public syncInstant(grid: number[][]) {
    // destroy current tiles
    this.tilesLayer.removeAll(true);
    this.tiles.clear();

    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const v = grid[r][c];
        if (v === 0) continue;
        const t = new TileView(this.scene, this.opts.tileSize, this.opts.radius ?? 12, this.opts.fontFamily);
        t.setValue(v);
        const { x, y } = this.cellCenter(r, c);
        t.setPosition(x, y);
        this.tilesLayer.add(t);
        this.tiles.set(`${r},${c}`, t);
      }
    }
  }

  /** Animate a set of movement diffs; does not change internal mapping.
   * Call syncInstant() afterwards with the committed grid.
   */
  public async animateMoves(diffs: { from:{r:number;c:number}; to:{r:number;c:number} }[], duration = 120): Promise<void> {
    // Build a lookup of current tiles by cell
    const map = new Map(this.tiles);
    const tweens: Promise<void>[] = [];

    for (const d of diffs) {
      const key = `${d.from.r},${d.from.c}`;
      const tv = map.get(key);
      if (!tv) continue; // tile might be invisible (shouldn't happen if grid is in sync)
      const { x, y } = this.cellCenter(d.to.r, d.to.c);
      tweens.push(tv.moveTo(x, y, duration));
    }
    await Promise.all(tweens);
  }

  /** After committing the state, pulse merged survivors and animate spawned tile. */
  public async postCommitEffects(
    grid: number[][],
    mergeTargets: { r:number; c:number; newValue:number }[],
    spawn?: { r:number; c:number }
  ) {
    this.syncInstant(grid); // tiles are already at their final values/positions
  
    // Pulse all survivors in parallel (no re-setValue needed)
    const pulses = mergeTargets.map(m => {
      const t = this.tiles.get(`${m.r},${m.c}`);
      return t ? t.pulseMerge() : Promise.resolve();
    });
  
    // Spawn animation (if any)
    let spawnP: Promise<void> = Promise.resolve();
    if (spawn) {
      const t = this.tiles.get(`${spawn.r},${spawn.c}`);
      if (t) spawnP = t.spawnIn();
    }
  
    await Promise.all([spawnP, ...pulses]);
  }
}
