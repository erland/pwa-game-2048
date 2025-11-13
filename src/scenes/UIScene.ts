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

    this.hookModalEvents();
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

  // ----- Modal support (Phase 3) -----
  private activeModal?: Phaser.GameObjects.Container;

  private hookModalEvents() {
    this.game.events.on('ui:showWinDialog', () => this.showModal('win'), this);
    this.game.events.on('ui:showGameOverDialog', () => this.showModal('gameover'), this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('ui:showWinDialog', undefined, this);
      this.game.events.off('ui:showGameOverDialog', undefined, this);
      this.closeModal();
    });
  }

  private closeModal() {
    if (this.activeModal) {
      this.activeModal.destroy();
      this.activeModal = undefined;
    }
  }

  private makeButton(x:number, y:number, label:string, onClick:()=>void) {
    const btn = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 160, 44, 0x303040, 0.9)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0xffffff, 0.6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => onClick());
    const txt = this.add.text(0, 0, label, { fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto', fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);
    btn.add([bg, txt]);
    return btn;
  }

  private showModal(kind: 'win' | 'gameover') {
    this.closeModal();

    const cam = this.cameras.main;
    const overlay = this.add.container(cam.centerX, cam.centerY).setDepth(2000);
    const dim = this.add.rectangle(0, 0, cam.width, cam.height, 0x000000, 0.55).setOrigin(0.5).setInteractive();
    const panel = this.add.container(0, 0);
    const panelBg = this.add.rectangle(0, 0, Math.min(420, cam.width - 40), 220, 0x151520, 0.95).setOrigin(0.5).setStrokeStyle(2, 0xffffff, 0.2);
    const title = this.add.text(0, -70, kind === 'win' ? 'You Win!' : 'Game Over', { fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto', fontSize: '28px', color: '#ffffff' }).setOrigin(0.5);

    const primary = (kind === 'win')
      ? this.makeButton(-90, 30, 'Continue', () => { this.game.events.emit('ui:continue'); this.closeModal(); })
      : this.makeButton(0, 30, 'New Game', () => { this.game.events.emit('ui:new'); this.closeModal(); });

    panel.add([panelBg, title, primary]);

    if (kind === 'win') {
      const secondary = this.makeButton(90, 30, 'New Game', () => { this.game.events.emit('ui:new'); this.closeModal(); });
      panel.add(secondary);
    }

    overlay.add([dim, panel]);
    this.activeModal = overlay;
  }

}

export default UIScene;
