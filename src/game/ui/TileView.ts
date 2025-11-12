import Phaser from 'phaser';

export class TileView extends Phaser.GameObjects.Container {
  private g: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private tileSize: number;
  private radius: number;
  private fontFamily: string;

  constructor(scene: Phaser.Scene, tileSize: number, radius = 12, fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto') {
    super(scene);
    this.tileSize = tileSize;
    this.radius = radius;
    this.fontFamily = fontFamily;
    this.g = scene.add.graphics();
    this.label = scene.add.text(0, 0, '', {
      fontFamily: this.fontFamily,
      fontSize: `${Math.round(tileSize * 0.5)}px`,
      color: '#776e65',
      align: 'center',
    }).setOrigin(0.5);
    this.add([this.g, this.label]);
  }

  private colorFor(v: number): number {
    switch (v) {
      case 2: return 0xeee4da;
      case 4: return 0xede0c8;
      case 8: return 0xf2b179;
      case 16: return 0xf59563;
      case 32: return 0xf67c5f;
      case 64: return 0xf65e3b;
      case 128: return 0xedcf72;
      case 256: return 0xedcc61;
      case 512: return 0xedc850;
      case 1024: return 0xedc53f;
      case 2048: return 0xedc22e;
      default: return 0x3c3a32;
    }
  }
  private textColorFor(v: number): string {
    return v <= 4 ? '#776e65' : '#f9f6f2';
  }
  private fontSizeFor(v: number): string {
    const len = String(v).length;
    const base = this.tileSize * 0.5;
    const sizePx = Math.max(18, base - (len - 1) * (this.tileSize * 0.07));
    return `${Math.round(sizePx)}px`;
  }

  setValue(v: number): void {
    this.g.clear();
    this.g.fillStyle(this.colorFor(v), 1);
    this.g.fillRoundedRect(-this.tileSize/2, -this.tileSize/2, this.tileSize, this.tileSize, this.radius);
    this.label.setText(String(v));
    this.label.setColor(this.textColorFor(v));
    this.label.setFontSize(this.fontSizeFor(v));
  }

  moveTo(x: number, y: number, duration: number): Promise<void> {
    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: this,
        x, y,
        duration,
        ease: 'Quad.easeInOut',
        onComplete: () => resolve()
      });
    });
  }

  spawnIn(duration = 120): Promise<void> {
    this.setScale(0.6);
    this.setAlpha(0);
    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: this,
        alpha: 1,
        scale: 1,
        duration,
        ease: 'Back.Out',
        onComplete: () => resolve()
      });
    });
  }

  pulseMerge(): Promise<void> {
    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: this,
        scale: 1.1,
        yoyo: true,
        duration: 120,
        ease: 'Sine.easeInOut',
        onComplete: () => resolve()
      });
    });
  }
}
