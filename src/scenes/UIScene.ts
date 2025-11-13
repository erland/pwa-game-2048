import Phaser from 'phaser';

type SettingsPayload = {
  size: number;
  target: number;
  reducedMotion: boolean;
  undoEnabled: boolean;
};

export class UIScene extends Phaser.Scene {
  static KEY = 'UIScene';

  private scoreText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private targetText!: Phaser.GameObjects.Text;
  private toastText?: Phaser.GameObjects.Text;
  private undoBtn?: Phaser.GameObjects.Text;

  // ----- Modal support (Phase 3) -----
  private activeModal?: Phaser.GameObjects.Container;

  // ----- Settings overlay -----
  private settingsOpen = false;
  private settingsLayer?: Phaser.GameObjects.Container;

  // Cache of current settings (updated by PlayScene via ui:settings)
  private currentSettings: SettingsPayload = {
    size: 4,
    target: 2048,
    reducedMotion: false,
    undoEnabled: true,
  };

  constructor() { super(UIScene.KEY); }  // ✅ register the key

  create(): void {
    const pad = 16;
    const style = { fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto', fontSize: '20px', color: '#ffffff' };

    // Simple top  HUD
    this.scoreText  = this.add.text(0, 0, 'Score: 0', style).setDepth(1000);
    this.bestText   = this.add.text(0, 0, 'Best: 0', style).setDepth(1000);
    this.targetText = this.add.text(0, 0, 'Target: 0', style).setDepth(1000);

    // Position them initially
    this.layoutHud();

    // Buttons (text buttons for Phase 2)
    const btnStyle = { ...style, fontSize: '18px', color: '#ffea00' as any };
    const newBtn      = this.add.text(pad,        pad + 60, '[ New ]',      btnStyle).setInteractive({ useHandCursor: true });
    this.undoBtn     = this.add.text(pad + 90,   pad + 60, '[ Undo ]',     btnStyle).setInteractive({ useHandCursor: true });
    const settingsBtn = this.add.text(pad + 180,  pad + 60, '[ Settings ]', btnStyle).setInteractive({ useHandCursor: true });

    newBtn.on('pointerup',  () => this.game.events.emit('ui:new'));
    this.undoBtn.on('pointerup', () => this.game.events.emit('ui:undo'));
    settingsBtn.on('pointerup', () => this.game.events.emit('ui:toggleSettings'));

    this.updateUndoVisibility();

    // Listen for updates from PlayScene
    this.game.events.on('hud:score', this.onHudScore, this);
    this.game.events.on('hud:toast', this.onToast, this);

    // ✅ Settings events (uniform, event-driven)
    this.game.events.on('ui:toggleSettings', this.onToggleSettings, this);
    this.game.events.on('ui:settings', this.onSettings, this); // PlayScene replies to ui:requestSettings

    // Ask PlayScene to send the current HUD values
    this.game.events.emit('hud:request');

    // Hook Win/GameOver modal events
    this.hookModalEvents();
  }

  shutdown(): void {
    this.game.events.off('hud:score', this.onHudScore, this);
    this.game.events.off('hud:toast', this.onToast, this);
    this.game.events.off('ui:toggleSettings', this.onToggleSettings, this);
    this.game.events.off('ui:settings', this.onSettings, this);
  }


  // --- HUD handlers ---
  private onHudScore = (payload: { score: number; best: number; target: number }) => {
    this.scoreText.setText(`Score: ${payload.score}`);
    this.bestText.setText(`Best: ${payload.best}`);
    this.targetText.setText(`Target: ${payload.target}`);
    this.layoutHud();
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

  // --- Settings handlers ---
  private onToggleSettings = () => {
    // Uniform pattern: ask PlayScene for settings, then open overlay with those values
    const willOpen = !this.settingsOpen;
    if (willOpen) {
      // Synchronous bus: PlayScene handler for 'ui:requestSettings' should emit 'ui:settings' immediately
      this.game.events.emit('ui:requestSettings');
      this.toggleSettings(true);
    } else {
      this.toggleSettings(false);
    }
  };

  private onSettings = (payload: SettingsPayload) => {
    this.currentSettings = payload;
    this.updateUndoVisibility();
  };

  private updateUndoVisibility() {
    if (!this.undoBtn) return;
    const enabled = this.currentSettings.undoEnabled;
  
    this.undoBtn.setVisible(enabled);
    this.undoBtn.setActive(enabled);
  
    // toggle interactivity too
    this.undoBtn.removeAllListeners(); // clear old listeners
    if (enabled) {
      this.undoBtn.setInteractive({ useHandCursor: true });
      this.undoBtn.on('pointerup', () => this.game.events.emit('ui:undo'));
    } else {
      this.undoBtn.disableInteractive();
    }
  }
  
  private layoutHud() {
    const pad = 16;
    const gap = 36;
    const cam = this.cameras.main;
  
    // Try horizontal layout first
    let x = pad;
    const y = pad;
  
    this.scoreText.setPosition(x, y);
    x += this.scoreText.width + gap;
  
    this.bestText.setPosition(x, y);
    x += this.bestText.width + gap;
  
    this.targetText.setPosition(x, y);
  
    // If HUD would overflow to the right, fall back to vertical stack
    const rightMost = this.targetText.x + this.targetText.width + pad;
    if (rightMost > cam.width) {
      this.scoreText.setPosition(pad, pad);
      this.bestText.setPosition(pad, pad + 22);
      this.targetText.setPosition(pad, pad + 44);
    }
  }
  
  // ----- Modal support (Phase 3) -----
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

  // ----- Settings overlay -----
  private buildSettingsOverlay() {
    if (this.settingsLayer) { this.settingsLayer.destroy(); this.settingsLayer = undefined; }

    const cam = this.cameras.main;
    const layer = this.add.container(cam.centerX, cam.centerY).setDepth(2500);
    const dim = this.add.rectangle(0,0,cam.width,cam.height,0x000000,0.55).setOrigin(0.5).setInteractive();
    const panel = this.add.container(0,0);
    const panelBg = this.add.rectangle(0,0, Math.min(520, cam.width-40), 300, 0x151520, 0.95).setOrigin(0.5).setStrokeStyle(2, 0xffffff, 0.2);
    const title = this.add.text(0,-110,'Settings',{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto', fontSize: '26px', color:'#ffffff'}).setOrigin(0.5);

    // Initialize from current settings (injected via ui:settings)
    let size    = this.currentSettings.size;
    let target  = this.currentSettings.target;
    let reduced = this.currentSettings.reducedMotion;
    let undo    = this.currentSettings.undoEnabled;

    const row = (y:number, label:string, valueText:()=>string, onToggle:()=>void) => {
      const c = this.add.container(0,y);
      const l = this.add.text(-180,0,label,{ fontFamily:'system-ui, -apple-system, Segoe UI, Roboto', fontSize:'18px', color:'#ffffff'}).setOrigin(0,0.5);
      const v = this.add.text(120,0,valueText(),{ fontFamily:'system-ui, -apple-system, Segoe UI, Roboto', fontSize:'18px', color:'#ffea00'}).setOrigin(0.5);
      const btn = this.add.text(200,0,'[ Toggle ]',{ fontFamily:'system-ui, -apple-system, Segoe UI, Roboto', fontSize:'18px', color:'#ffea00'}).setOrigin(0.5).setInteractive({ useHandCursor:true });
      btn.on('pointerup', () => { onToggle(); v.setText(valueText()); });
      c.add([l,v,btn]);
      return c;
    };

    const sizeRow = row(-60, 'Board Size', () => size+'x'+size, () => { size = size===6?3:size+1; });
    const targetRow = row(-20, 'Target', () => String(target), () => {
      const options = [512,1024,2048,4096];
      const idx = Math.max(0, options.indexOf(target));
      target = options[(idx+1)%options.length];
    });
    const reducedRow = row(20, 'Reduced Motion', () => reduced?'On':'Off', () => { reduced = !reduced; });
    const undoRow = row(60, 'Undo', () => undo?'Enabled':'Disabled', () => { undo = !undo; });

    const saveBtn = this.add.text(-80,110,'[ Save ]',{ fontFamily:'system-ui, -apple-system, Segoe UI, Roboto', fontSize:'18px', color:'#ffea00'}).setOrigin(0.5).setInteractive({ useHandCursor:true });
    const cancelBtn = this.add.text(80,110,'[ Cancel ]',{ fontFamily:'system-ui, -apple-system, Segoe UI, Roboto', fontSize:'18px', color:'#ffea00'}).setOrigin(0.5).setInteractive({ useHandCursor:true });

    saveBtn.on('pointerup', () => {
      this.game.events.emit('ui:applySettings', { size, target, reducedMotion: reduced, undoEnabled: undo });
      this.toggleSettings(false);
    });
    cancelBtn.on('pointerup', () => this.toggleSettings(false));

    panel.add([panelBg, title, sizeRow, targetRow, reducedRow, undoRow, saveBtn, cancelBtn]);
    layer.add([dim, panel]);
    this.settingsLayer = layer;
  }

  private toggleSettings(force?: boolean) {
    const next = typeof force==='boolean' ? force : !this.settingsOpen;
    this.settingsOpen = next;
    if (this.settingsOpen) {
      // overlay opens with whatever onSettings just populated
      this.buildSettingsOverlay();
    } else {
      this.settingsLayer?.destroy();
      this.settingsLayer = undefined;
    }
  }
}

export default UIScene;