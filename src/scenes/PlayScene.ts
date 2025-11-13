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
import UIScene from './UIScene';
import { loadSettings, saveSettings, type Settings } from '../game/services/settings';
import { saveGame, loadGame, clearGame } from '../game/services/persistence';

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
      throttleMs: 150,
      repeatMode: 'edge',
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
  // Show Win dialog only once per game
  private winAcknowledged = false;
  private gameConfig!: { size: number; target: number };
  private reducedMotion = false;
  private undoEnabled = true;
  private boardRows = 0;
  private boardCols = 0;
  

  /** BasePlayScene will call this (no args). Build your world here. */
  protected buildWorld(): void {
    // Root for this scene’s content
    this.worldRoot = this.add.container(0, 0);

    // Load settings
    const s = loadSettings();
    this.gameConfig = { size: s.size, target: s.target };
    this.reducedMotion =
      s.reducedMotion || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
    this.undoEnabled = s.undoEnabled !== false;

    // Domain state
    clearGame();
    this.state = newGame(this.gameConfig);

    // Board view (no textures; graphics+text)
    this.ensureBoardMatchesState();

    // Try resume from last session if compatible
    const saved = loadGame();
    if (
      saved &&
      saved.grid.length === this.state.grid.length &&
      saved.grid[0].length === this.state.grid[0].length &&
      saved.target === this.state.target
    ) {
      this.state = saved;
      this.board.syncInstant(this.state.grid);
    }

    // Framework BoardFitter — fits/centers based on dynamic size
    this.fitter = new BoardFitter(
      this,
      this.worldRoot,
      () => ({ w: this.board.pixelWidth(), h: this.board.pixelHeight() }),
      { fitMode: 'fit', integerZoom: true }
    );
    this.fitter.attach();
    this.cameras.main.setRoundPixels(true);

    // UIScene comms
    this.game.events.on('ui:new', this.onNewGame, this);
    this.game.events.on('ui:undo', this.onUndo, this);
    this.game.events.on('ui:continue', this.onContinue, this);

    // ✅ Provide current settings to UIScene on request
    this.game.events.on('ui:requestSettings', () => {
      this.game.events.emit('ui:settings', {
        size: this.gameConfig.size,
        target: this.gameConfig.target,
        reducedMotion: this.reducedMotion,
        undoEnabled: this.undoEnabled,
      });
    }, this);

    // Framework DirectionalInputController (keyboard+swipe+gamepad)
    this.inputCtl = new GameInputController(this, (dir) => this.onMove(dir));
    this.inputCtl.attach();

    // Launch HUD above the game
    this.scene.launch(UIScene.KEY);
    this.scene.bringToTop(UIScene.KEY);

    // Let UI ask for state too (optional but robust)
    this.game.events.on('hud:request', () => this.emitScore(), this);

    // Settings
    this.game.events.on('ui:applySettings', this.onApplySettings, this);

    // Initial HUD sync
    this.emitScore();
  }

  /** Create or resize the BoardView to match current this.state.grid, then sync. */
  private ensureBoardMatchesState() {
    const rows = this.state.grid.length;
    const cols = this.state.grid[0].length;
    const sizeChanged = !this.board || rows !== this.boardRows || cols !== this.boardCols;

    if (sizeChanged) {
      if (this.board) this.board.destroy();

      this.board = new BoardView(this, {
        rows,
        cols,
        tileSize: 96,
        gap: 12,
        radius: 12,
      });
      this.worldRoot.add(this.board);

      this.boardRows = rows;
      this.boardCols = cols;
    }

    this.board.syncInstant(this.state.grid);
  }

  private onApplySettings = (payload: Settings) => {
    const { size, target, reducedMotion, undoEnabled } = payload;
    this.gameConfig = { size, target };
    this.reducedMotion = !!reducedMotion || (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
    this.undoEnabled = undoEnabled !== false;
    saveSettings({ size, target, reducedMotion: this.reducedMotion, undoEnabled: this.undoEnabled });
    // Start fresh with new config
    this.onNewGame();
  };


  /** Per-frame; poll the input controller here. */
  protected tick(_dt: number): void {
    this.inputCtl?.poll();
  }

  override shutdown(): void {
    this.fitter?.destroy();      // detach resize listener
    this.inputCtl?.destroy();    // cleanup swipe, etc.
    this.game.events.off('ui:new', this.onNewGame, this);
    this.game.events.off('ui:undo', this.onUndo, this);
    this.game.events.off('ui:applySettings', this.onApplySettings, this);
    this.game.events.off('ui:continue', this.onContinue, this);
    this.game.events.off('ui:requestSettings', undefined, this);
    super.shutdown?.();
  }

  // --- internal helpers ---
  private onNewGame = () => {
    this.winAcknowledged = false;             // reset for a new run
    clearGame();
    this.state = newGame(this.gameConfig);
    this.ensureBoardMatchesState();
    this.board.syncInstant(this.state.grid);

    // Try resume from last session if compatible
    const saved = loadGame();
    if (saved && saved.grid.length === this.state.grid.length && saved.grid[0].length === this.state.grid[0].length && saved.target === this.state.target) {
      this.state = saved;
      this.board.syncInstant(this.state.grid);
    }
    this.emitScore();
    this.toast('New game');
  };

  private onContinue = () => {
    this.winAcknowledged = true;              // user chose to continue: don't show win again
  };

  private onUndo = () => {
    if (!this.undoEnabled) { this.toast('Undo disabled'); return; }
    const next = undo(this.state);
    if (next) {
      this.state = next;
      this.board.syncInstant(this.state.grid);

    // Try resume from last session if compatible
    const saved = loadGame();
    if (saved && saved.grid.length === this.state.grid.length && saved.grid[0].length === this.state.grid[0].length && saved.target === this.state.target) {
      this.state = saved;
      this.board.syncInstant(this.state.grid);
    }
      this.emitScore();
      this.toast('Undid last move');
    } else {
      this.toast('Nothing to undo');
    }
  };

  private async onMove(dir: 'up' | 'down' | 'left' | 'right') {
    if (this.animLock) {
      if (!this.queued) this.queued = dir;
      return;
    }
    this.animLock = true; // ⬅️ lock immediately
  
    const map: Record<string, MoveDir> = {
      up: MoveDir.Up,
      down: MoveDir.Down,
      left: MoveDir.Left,
      right: MoveDir.Right,
    };
  
    const plan = planMove(this.state, map[dir]);
  
    // Invalid move: do a nudge, then unlock and play any queued input
    if (!plan.changed) {
      const axis = dir === 'left' || dir === 'right' ? 'x' : 'y';
      const delta = dir === 'left' || dir === 'up' ? -8 : 8;
      await new Promise<void>((resolve) => {
        this.tweens.add({
          targets: this.worldRoot,
          [axis]: `+=${delta}`,
          yoyo: true,
          duration: 60,
          ease: 'Sine.easeInOut',
          onComplete: () => resolve(),
        });
      });
      this.animLock = false;
      if (this.queued) {
        const q = this.queued; this.queued = null;
        this.onMove(q);
      }
      return;
    }
  
    try {
      // Pre-commit animation
      await this.board.animateMoves(plan.diffs, 100, this.reducedMotion);
  
      // Commit + effects
      const { next } = tryMove(this.state, map[dir]);
      const spawn = findSpawn(plan.gridAfterMove, next.grid);
      const mergeTargets = collectMergeTargets(plan.diffs);
  
      this.state = next;
      this.emitScore();
      saveGame(this.state);
  
      await this.board.postCommitEffects(this.state.grid, mergeTargets, spawn, this.reducedMotion);
  
      if (!hasMoves(this.state.grid)) {
        this.game.events.emit('ui:showGameOverDialog');
      }else if (hasWon(this.state.grid, this.state.target)) {
        if (!this.winAcknowledged) {
          this.game.events.emit('ui:showWinDialog');
        }
      } 
    } finally {
      this.animLock = false; // ⬅️ always release
      if (this.queued) {
        const q = this.queued; this.queued = null;
        this.onMove(q);
      }
    }
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
