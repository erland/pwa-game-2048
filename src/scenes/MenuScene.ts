import Phaser from 'phaser';
import { BaseMenuScene } from '@erlandlindmark/pwa-game-2d-framework';

/** Minimal menu powered by BaseMenuScene (title + pulsing hint + Enter/Space/Pointer to start). */
export class MenuScene extends BaseMenuScene {
  /** Optional background (e.g., color fill, parallax, logo). */
  protected buildBackground(): void {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x101018).setOrigin(0, 0);
  }

  protected afterCreate(): void {
    // Start game immedately
    this.startGame();
  }
}
