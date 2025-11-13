// src/game/ui/SettingsOverlay.ts
import Phaser from 'phaser';

export type SettingsPayload = {
  size: number;
  target: number;
  reducedMotion: boolean;
  undoEnabled: boolean;
};

type SettingsOverlayCallbacks = {
  onSave: (settings: SettingsPayload) => void;
  onCancel: () => void;
};

/**
 * Builds a settings overlay container for UIScene.
 * - Uses the given current settings as initial state.
 * - Tapping the value text toggles the value.
 * - Calls onSave / onCancel when appropriate.
 */
export function createSettingsOverlay(
  scene: Phaser.Scene,
  current: SettingsPayload,
  callbacks: SettingsOverlayCallbacks
): Phaser.GameObjects.Container {
  const cam = scene.cameras.main;
  const layer = scene.add.container(cam.centerX, cam.centerY).setDepth(2500);

  const dim = scene.add.rectangle(
    0,
    0,
    cam.width,
    cam.height,
    0x000000,
    0.55
  ).setOrigin(0.5).setInteractive();

  const panel = scene.add.container(0, 0);

  const panelWidth = Math.min(520, cam.width - 40);
  const panelBg = scene.add.rectangle(
    0,
    0,
    panelWidth,
    300,
    0x151520,
    0.95
  ).setOrigin(0.5).setStrokeStyle(2, 0xffffff, 0.2);

  const title = scene.add.text(0, -110, 'Settings', {
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto',
    fontSize: '26px',
    color: '#ffffff',
  }).setOrigin(0.5);

  // Initialize from current settings
  let size    = current.size;
  let target  = current.target;
  let reduced = current.reducedMotion;
  let undo    = current.undoEnabled;

  const row = (
    y: number,
    label: string,
    valueText: () => string,
    onToggle: () => void
  ) => {
    const c = scene.add.container(0, y);

    const half = panelWidth / 2 - 16; // inner padding
    const labelX = -half;
    const valueX = half;

    const l = scene.add.text(labelX, 0, label, {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto',
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0, 0.5);

    const v = scene.add.text(valueX, 0, valueText(), {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto',
      fontSize: '18px',
      color: '#ffea00',
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });

    // Tap the value to toggle
    v.on('pointerup', () => {
      onToggle();
      v.setText(valueText());
    });

    c.add([l, v]);
    return c;
  };

  const sizeRow = row(-60, 'Board Size', () => size + 'x' + size, () => {
    // Keep your existing behavior (cycle 4 <-> 5, or whatever you want here)
    size = size === 5 ? 4 : size + 1;
  });

  const targetRow = row(-20, 'Target', () => String(target), () => {
    const options = [512, 1024, 2048, 4096];
    const idx = Math.max(0, options.indexOf(target));
    target = options[(idx + 1) % options.length];
  });

  const reducedRow = row(20, 'Reduced Motion', () => (reduced ? 'On' : 'Off'), () => {
    reduced = !reduced;
  });

  const undoRow = row(60, 'Undo', () => (undo ? 'Enabled' : 'Disabled'), () => {
    undo = !undo;
  });

  const saveBtn = scene.add.text(-80, 110, '[ Save ]', {
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto',
    fontSize: '18px',
    color: '#ffea00',
  }).setOrigin(0.5).setInteractive({ useHandCursor: true });

  const cancelBtn = scene.add.text(80, 110, '[ Cancel ]', {
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto',
    fontSize: '18px',
    color: '#ffea00',
  }).setOrigin(0.5).setInteractive({ useHandCursor: true });

  saveBtn.on('pointerup', () => {
    callbacks.onSave({
      size,
      target,
      reducedMotion: reduced,
      undoEnabled: undo,
    });
  });

  cancelBtn.on('pointerup', () => {
    callbacks.onCancel();
  });

  panel.add([
    panelBg,
    title,
    sizeRow,
    targetRow,
    reducedRow,
    undoRow,
    saveBtn,
    cancelBtn,
  ]);

  layer.add([dim, panel]);
  return layer;
}