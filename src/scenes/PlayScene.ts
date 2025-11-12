// src/scenes/PlayScene.ts
import Phaser from 'phaser';
import {
  BasePlayScene,
  BoardFitter,
  DirectionalInputController,
  Dir4,
} from '@erlandlindmark/pwa-game-2d-framework';

import { BoardView } from '../game/ui/BoardView';

import {
  newGame,
  tryMove,
  planMove,
  undo,
  hasMoves,
  hasWon,
  MoveDir,
  GameState,
} from '../game/core';

/** Maps framework Dir4 to our reducer’s dir strings */
function dir4ToStr(d: Dir4): 'up' | 'down' | 'left' | 'right' {
  switch (d) {
    case Dir4.Up: return 'up';
    case Dir4.Down: return 'down';
    case Dir4.Left: return 'left';
    case Dir4.Right: return 'right';
  }
}

/** Small concrete controller that forwards directions to PlayScene.onMove */
class GameInputController extends DirectionalInputController {
  constructor(
    scene: Phaser.Scene,
    private onMoveCb: (dir: 'up' | 'down' | 'left' | 'right') => void
  ) {
    super(scene, {
      allowKeyboard: true,
      allowWASD: true,
      allowSwipe: true,
      allowGamepad: true,
      throttleMs: 80,
      repeatMode: 'repeat',
      // explicit bindings (arrows + WASD)
      bindings: {
        up:    [Phaser.Input.Keyboard.KeyCodes.UP,    Phaser.Input.Keyboard.KeyCodes.W],
        down:  [Phaser.Input.Keyboard.KeyCodes.DOWN,  Phaser.Input.Keyboard.KeyCodes.S],
        left:  [Phaser.Input.Keyboard.KeyCodes.LEFT,  Phaser.Input.Keyboard.KeyCodes.A],
        right: [Phaser.Input.Keyboard.KeyCodes.RIGHT, Phaser.Input.Keyboard.KeyCodes.D],
      },
      swipeMinDistance: 24,
      deadzone: 0.25,
    });
  }
  protected onDirection(dir: Dir4): void {
    this.onMoveCb(dir4ToStr(dir));
  }
}

export class PlayScene extends BasePlayScene {
  static KEY = 'PlayScene';

  private state!: GameState;
  private board!: BoardView;

  private animLock = false;
  private queued: ('up'|'down'|'left'|'right') | null = null;

  private worldRoot!: Phaser.GameObjects.Container;
  private fitter?: BoardFitter;
  private inputCtl?: GameInputController;

  /** BasePlayScene will call this (no args). Build your world here. */
  protected buildWorld(): void {
    // Root for this scene’s content
    this.worldRoot = this.add.container(0, 0);

    // Domain state
    this.state = newGame({ size: 4, target: 2048 });

    // Board view (no textures; graphics+text)
    const rows = this.state.grid.length;
    const cols = this.state.grid[0].length;
    this.board = new BoardView(this, {
      rows,
      cols,
      tileSize: 96,
      gap: 12,
      radius: 12,
    });
    this.worldRoot.add(this.board);
    this.board.syncInstant(this.state.grid);

    // Framework BoardFitter — fits/centers based on dynamic size
    this.fitter = new BoardFitter(
      this,
      this.worldRoot,
      () => ({ w: this.board.pixelWidth(), h: this.board.pixelHeight() }),
      { fitMode: 'fit', integerZoom: true }
    );
    this.fitter.attach();

    // UIScene comms
    this.game.events.on('ui:new', this.onNewGame, this);
    this.game.events.on('ui:undo', this.onUndo, this);

    // Framework DirectionalInputController (keyboard+swipe+gamepad)
    this.inputCtl = new GameInputController(this, (dir) => this.onMove(dir));
    this.inputCtl.attach();

    // Initial HUD sync
    this.emitScore();
  }

  /** Per-frame; poll the input controller here. */
  protected tick(_dt: number): void {
    this.inputCtl?.poll();
  }

  override shutdown(): void {
    this.fitter?.destroy();      // detach resize listener
    this.inputCtl?.destroy();    // cleanup swipe, etc.
    this.game.events.off('ui:new', this.onNewGame, this);
    this.game.events.off('ui:undo', this.onUndo, this);
    super.shutdown?.();
  }

  // --- internal helpers ---
  private onNewGame = () => {
    this.state = newGame({ size: 4, target: 2048 });
    this.board.syncInstant(this.state.grid);
    this.emitScore();
    this.toast('New game');
  };

  private onUndo = () => {
    const next = undo(this.state);
    if (next) {
      this.state = next;
      this.board.syncInstant(this.state.grid);
      this.emitScore();
      this.toast('Undid last move');
    } else {
      this.toast('Nothing to undo');
    }
  };

  private onMove(dir: 'up' | 'down' | 'left' | 'right') {
  if (this.animLock) {
    if (!this.queued) this.queued = dir;
    return;
  }
  const map: Record<string, MoveDir> = {
    up: MoveDir.Up,
    down: MoveDir.Down,
    left: MoveDir.Left,
    right: MoveDir.Right,
  };
  const plan = planMove(this.state, map[dir]);
  if (!plan.changed) {
    const axis = (dir === 'left' || dir === 'right') ? 'x' : 'y';
    const delta = (dir === 'left' || dir === 'up') ? -8 : 8;
    this.tweens.add({
      targets: this.worldRoot,
      [axis]: `+=${delta}`,
      yoyo: true,
      duration: 60,
      ease: 'Sine.easeInOut',
    });
    return;
  }
  this.animLock = true;
  this.board.animateMoves(plan.diffs, 100).then(async () => {
    const { next } = tryMove(this.state, map[dir]);
    const spawn = findSpawn(plan.gridAfterMove, next.grid);
    const mergeTargets = collectMergeTargets(plan.diffs);
    this.state = next;
    this.emitScore();
    await this.board.postCommitEffects(this.state.grid, mergeTargets, spawn);
    if (hasWon(this.state.grid, this.state.target)) {
      this.toast('You win!');
    } else if (!hasMoves(this.state.grid)) {
      this.toast('Game over');
    }
    this.animLock = false;
    if (this.queued) {
      const q = this.queued; this.queued = null; this.onMove(q);
    }
  });
}


  private emitScore() {
    this.game.events.emit('hud:score', {
      score: this.state.score,
      best: this.state.best,
      target: this.state.target,
    });
  }

  private toast(message: string) {
    this.game.events.emit('hud:toast', { message });
  }
}

export default PlayScene;

function findSpawn(before: number[][], after: number[][]): {r:number;c:number} | undefined {
  for (let r=0; r<after.length; r++) {
    for (let c=0; c<after[r].length; c++) {
      if (before[r][c] === 0 && after[r][c] !== 0) return { r, c };
    }
  }
  return undefined;
}
function collectMergeTargets(diffs: { to:{r:number;c:number}; survivor?:boolean; newValue?: number }[]): {r:number;c:number;newValue:number}[] {
  const m = new Map<string, number>();
  for (const d of diffs) if (d.survivor && d.newValue) {
    m.set(`${d.to.r},${d.to.c}`, d.newValue);
  }
  return Array.from(m.entries()).map(([k,v]) => {
    const [rs,cs] = k.split(','); return { r: parseInt(rs,10), c: parseInt(cs,10), newValue: v };
  });
}
