import Phaser from 'phaser';
import { createResultModal } from '../game/ui/ResultModal';
import { createSettingsOverlay, type SettingsPayload } from '../game/ui/SettingsOverlay';

export class UIScene extends Phaser.Scene {
  static KEY = 'UIScene';

  private scoreText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private targetText!: Phaser.GameObjects.Text;
  private toastText?: Phaser.GameObjects.Text;
  private undoBtn?: Phaser.GameObjects.Text;

  // ----- Modal support (Win/Game Over) -----
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

  constructor() {
    super(UIScene.KEY);
  }

  create(): void {
    const pad = 16;
    const style = {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto',
      fontSize: '20px',
      color: '#ffffff',
    };

    // ----- HUD -----
    this.scoreText  = this.add.text(0, 0, 'Score: 0', style).setDepth(1000);
    this.bestText   = this.add.text(0, 0, 'Best: 0',  style).setDepth(1000);
    this.targetText = this.add.text(0, 0, 'Target: 0', style).setDepth(1000);
    this.layoutHud();

    // ----- Buttons -----
    const btnStyle = { ...style, fontSize: '18px', color: '#ffea00' as any };
    const newBtn      = this.add
      .text(pad, pad + 60, '[ New ]', btnStyle)
      .setInteractive({ useHandCursor: true });
    this.undoBtn      = this.add
      .text(pad + 90, pad + 60, '[ Undo ]', btnStyle)
      .setInteractive({ useHandCursor: true });
    const settingsBtn = this.add
      .text(pad + 180, pad + 60, '[ Settings ]', btnStyle)
      .setInteractive({ useHandCursor: true });

    newBtn.on('pointerup', () => this.game.events.emit('ui:new'));
    this.undoBtn.on('pointerup', () => this.game.events.emit('ui:undo'));
    settingsBtn.on('pointerup', () => this.game.events.emit('ui:toggleSettings'));

    this.updateUndoVisibility();

    // ----- Event wiring -----
    this.game.events.on('hud:score', this.onHudScore, this);
    this.game.events.on('hud:toast', this.onToast, this);

    this.game.events.on('ui:toggleSettings', this.onToggleSettings, this);
    this.game.events.on('ui:settings', this.onSettings, this); // PlayScene replies to ui:requestSettings

    // Ask PlayScene to send the current HUD values
    this.game.events.emit('hud:request');

    // Win/GameOver modals
    this.hookModalEvents();
  }

  shutdown(): void {
    this.game.events.off('hud:score', this.onHudScore, this);
    this.game.events.off('hud:toast', this.onToast, this);
    this.game.events.off('ui:toggleSettings', this.onToggleSettings, this);
    this.game.events.off('ui:settings', this.onSettings, this);
  }

  // --- HUD handlers ---------------------------------------------------------

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
    })
      .setOrigin(0.5, 1)
      .setDepth(1001);

    this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      duration: 1200,
      ease: 'Sine.easeIn',
      delay: 800,
      onComplete: () => this.toastText?.destroy(),
    });
  };

  private layoutHud() {
    const pad = 16;
    const gap = 24;
    const cam = this.cameras.main;

    let x = pad;
    const y = pad;

    this.scoreText.setPosition(x, y);
    x += this.scoreText.width + gap;

    this.bestText.setPosition(x, y);
    x += this.bestText.width + gap;

    this.targetText.setPosition(x, y);

    // If HUD would overflow to the right, just drop Target onto next line
    const rightMost = this.targetText.x + this.targetText.width + pad;
    if (rightMost > cam.width) {
      this.targetText.setPosition(pad, pad + 22);
    }
  }

  // --- Settings handlers ----------------------------------------------------

  private onToggleSettings = () => {
    const willOpen = !this.settingsOpen;
    if (willOpen) {
      // PlayScene should respond immediately with ui:settings
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

    this.undoBtn.removeAllListeners();
    if (enabled) {
      this.undoBtn.setInteractive({ useHandCursor: true });
      this.undoBtn.on('pointerup', () => this.game.events.emit('ui:undo'));
    } else {
      this.undoBtn.disableInteractive();
    }
  }

  // --- Win/Game Over modal (via ResultModal) --------------------------------

  private hookModalEvents() {
    this.game.events.on('ui:showWinDialog', this.onShowWinDialog, this);
    this.game.events.on('ui:showGameOverDialog', this.onShowGameOverDialog, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('ui:showWinDialog', this.onShowWinDialog, this);
      this.game.events.off('ui:showGameOverDialog', this.onShowGameOverDialog, this);
      this.closeModal();
    });
  }

  private onShowWinDialog = () => {
    this.closeModal();
    this.activeModal = createResultModal(this, 'win', {
      onContinue: () => this.game.events.emit('ui:continue'),
      onNewGame: () => this.game.events.emit('ui:new'),
      onClose: () => this.closeModal(),
    });
  };

  private onShowGameOverDialog = () => {
    this.closeModal();
    this.activeModal = createResultModal(this, 'gameover', {
      onNewGame: () => this.game.events.emit('ui:new'),
      onClose: () => this.closeModal(),
    });
  };

  private closeModal() {
    if (this.activeModal) {
      this.activeModal.destroy();
      this.activeModal = undefined;
    }
  }

  // --- Settings overlay (via SettingsOverlay helper) ------------------------

  private buildSettingsOverlay() {
    if (this.settingsLayer) {
      this.settingsLayer.destroy();
      this.settingsLayer = undefined;
    }

    this.settingsLayer = createSettingsOverlay(this, this.currentSettings, {
      onSave: (settings) => {
        this.game.events.emit('ui:applySettings', settings);
        this.toggleSettings(false);
      },
      onCancel: () => {
        this.toggleSettings(false);
      },
    });
  }

  private toggleSettings(force?: boolean) {
    const next = typeof force === 'boolean' ? force : !this.settingsOpen;
    this.settingsOpen = next;

    if (this.settingsOpen) {
      this.buildSettingsOverlay();
    } else {
      this.settingsLayer?.destroy();
      this.settingsLayer = undefined;
    }
  }
}

export default UIScene;