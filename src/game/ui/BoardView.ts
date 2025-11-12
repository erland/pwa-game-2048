/**
 * Minimal board renderer for 2048.
 * - No textures required (Graphics + Text).
 * - Re-renders cheaply on each state change (Phase 2: no movement animations).
 */
import Phaser from 'phaser';

export type BoardViewOptions = {
  rows: number;
  cols: number;
  tileSize: number;   // base tile size before any scaling
  gap: number;        // spacing between tiles
  radius?: number;    // rounded corners
  fontFamily?: string;
};

export class BoardView extends Phaser.GameObjects.Container {
  private opts: BoardViewOptions;
  private bg!: Phaser.GameObjects.Graphics;
  private tilesLayer!: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, opts: BoardViewOptions) {
    super(scene);
    this.opts = { ...opts };
    this.setSize(this.pixelWidth(), this.pixelHeight());

    this.bg = scene.add.graphics();
    this.tilesLayer = scene.add.container();

    this.add([this.bg, this.tilesLayer]);
    this.redrawBackground();
  }

  /** Total pixel width of the board (without external scale). */
  pixelWidth(): number {
    const { cols, tileSize, gap } = this.opts;
    return cols * tileSize + (cols + 1) * gap;
  }
  /** Total pixel height of the board (without external scale). */
  pixelHeight(): number {
    const { rows, tileSize, gap } = this.opts;
    return rows * tileSize + (rows + 1) * gap;
  }

  /** Lay out position for tile (r,c) in local container coordinates. */
  private tilePosition(r: number, c: number): { x: number; y: number } {
    const { tileSize, gap } = this.opts;
    const x = gap + c * (tileSize + gap) + tileSize / 2;
    const y = gap + r * (tileSize + gap) + tileSize / 2;
    return { x, y };
  }

  private colorFor(value: number): number {
    // Simple neutral palette; adjust later with your theme
    switch (value) {
      case 0:   return 0xcdc1b4; // empty (grid slot)
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
      default:  return 0x3c3a32; // beyond 2048
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

    // Draw empty slots
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

  /**
   * Re-render entire grid. Phase 2 keeps this simple.
   * @param grid rows x cols numeric grid
   */
  renderGrid(grid: number[][]) {
    const { fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto' } = this.opts;
    this.tilesLayer.removeAll(true);

    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const value = grid[r][c];
        if (value === 0) continue;

        const { x, y } = this.tilePosition(r, c);
        const g = this.scene.add.graphics();
        const text = this.scene.add.text(0, 0, String(value), {
          fontFamily,
          fontSize: this.fontSizeFor(value),
          color: this.textColorFor(value),
          align: 'center',
        }).setOrigin(0.5);

        g.fillStyle(this.colorFor(value), 1);
        const ts = this.opts.tileSize;
        g.fillRoundedRect(-ts / 2, -ts / 2, ts, ts, this.opts.radius ?? 12);

        const tile = this.scene.add.container(x, y, [g, text]);
        this.tilesLayer.add(tile);
      }
    }
  }

  private fontSizeFor(value: number): string {
    // scale value text for longer numbers
    const len = String(value).length;
    const base = this.opts.tileSize * 0.5;
    const sizePx = Math.max(18, base - (len - 1) * (this.opts.tileSize * 0.07));
    return `${Math.round(sizePx)}px`;
  }
}
