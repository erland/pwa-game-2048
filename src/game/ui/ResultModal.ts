// src/game/ui/ResultModal.ts
import Phaser from 'phaser';

export type ResultKind = 'win' | 'gameover';

type ResultModalCallbacks = {
  /** Only used for 'win' modal */
  onContinue?: () => void;
  /** Called when New Game button is pressed */
  onNewGame: () => void;
  /** Called whenever the modal should be closed */
  onClose: () => void;
};

/**
 * Creates a Win/Game Over modal overlay.
 * - 'win' = Continue + New Game buttons
 * - 'gameover' = New Game only
 */
export function createResultModal(
  scene: Phaser.Scene,
  kind: ResultKind,
  callbacks: ResultModalCallbacks
): Phaser.GameObjects.Container {
  const cam = scene.cameras.main;
  const overlay = scene.add.container(cam.centerX, cam.centerY).setDepth(2000);

  const dim = scene.add.rectangle(
    0,
    0,
    cam.width,
    cam.height,
    0x000000,
    0.55
  )
    .setOrigin(0.5)
    .setInteractive(); // swallow input behind modal

  const panel = scene.add.container(0, 0);
  const panelBg = scene.add.rectangle(
    0,
    0,
    Math.min(420, cam.width - 40),
    220,
    0x151520,
    0.95
  )
    .setOrigin(0.5)
    .setStrokeStyle(2, 0xffffff, 0.2);

  const title = scene.add.text(
    0,
    -70,
    kind === 'win' ? 'You Win!' : 'Game Over',
    {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto',
      fontSize: '28px',
      color: '#ffffff',
    }
  ).setOrigin(0.5);

  const makeButton = (
    x: number,
    y: number,
    label: string,
    onClick: () => void
  ) => {
    const btn = scene.add.container(x, y);
    const bg = scene.add.rectangle(0, 0, 160, 44, 0x303040, 0.9)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0xffffff, 0.6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => onClick());
    const txt = scene.add.text(0, 0, label, {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto',
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);
    btn.add([bg, txt]);
    return btn;
  };

  let primary: Phaser.GameObjects.Container;
  let secondary: Phaser.GameObjects.Container | undefined;

  if (kind === 'win') {
    primary = makeButton(-90, 30, 'Continue', () => {
      callbacks.onContinue?.();
      callbacks.onClose();
    });

    secondary = makeButton(90, 30, 'New Game', () => {
      callbacks.onNewGame();
      callbacks.onClose();
    });
  } else {
    // gameover: only New Game in center
    primary = makeButton(0, 30, 'New Game', () => {
      callbacks.onNewGame();
      callbacks.onClose();
    });
  }

  panel.add([panelBg, title, primary]);
  if (secondary) panel.add(secondary);

  overlay.add([dim, panel]);
  return overlay;
}