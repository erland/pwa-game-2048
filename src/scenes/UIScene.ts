import Phaser from 'phaser';

export class UIScene extends Phaser.Scene {
  static KEY = 'UIScene';

  private scoreText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private toastText?: Phaser.GameObjects.Text;

  constructor() { super(UIScene.KEY); }  // ✅ register the key

  create(): void {
    const pad = 16;
    const style = { fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto', fontSize: '20px', color: '#ffffff' };

    // Simple top-left HUD
    this.scoreText = this.add.text(pad, pad, 'Score: 0', style).setDepth(1000);
    this.bestText = this.add.text(pad, pad + 26, 'Best: 0', style).setDepth(1000);

    // Buttons (text buttons for Phase 2)
    const btnStyle = { ...style, fontSize: '18px', color: '#ffea00' as any };
    const newBtn = this.add.text(pad, pad + 60, '[ New ]', btnStyle).setInteractive({ useHandCursor: true });
    const undoBtn = this.add.text(pad + 90, pad + 60, '[ Undo ]', btnStyle).setInteractive({ useHandCursor: true });

    newBtn.on('pointerup', () => this.game.events.emit('ui:new'));
    undoBtn.on('pointerup', () => this.game.events.emit('ui:undo'));

    // Listen for updates from PlayScene
    this.game.events.on('hud:score', this.onHudScore, this);
    this.game.events.on('hud:toast', this.onToast, this);

    // Ask PlayScene to send the current values
    this.game.events.emit('hud:request');
  }

  shutdown(): void {
    this.game.events.off('hud:score', this.onHudScore, this);
    this.game.events.off('hud:toast', this.onToast, this);
  }

  private onHudScore = (payload: { score: number; best: number; target: number }) => {
    this.scoreText.setText(`Score: ${payload.score}`);
    this.bestText.setText(`Best: ${payload.best}`);
  };

  private onToast = (payload: { message: string }) => {
    if (this.toastText) {
      this.toastText.destroy();
      this.toastText = undefined;
    }
    const cam = this.cameras.main;
    this.toastText = this.add.text(cam.centerX, cam.height - 32, payload.message, {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto',
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#00000080',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5, 1).setDepth(1001);

    this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      duration: 1200,
      ease: 'Sine.easeIn',
      delay: 800,
      onComplete: () => this.toastText?.destroy()
    });
  };
}

export default UIScene;
