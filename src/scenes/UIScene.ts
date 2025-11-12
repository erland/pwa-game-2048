import Phaser from 'phaser';

/** Simple overlay UI scene (placeholder for HUD/score). */
export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UI' });
  }
  create(): void {
    const { width } = this.scale;
    const hint = this.add.text(width - 12, 12, 'UI', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ffffff'
    });
    hint.setOrigin(1, 0).setAlpha(0.6);
    // This scene is intended to sit above PlayScene
    this.scene.bringToTop();
  }
}
