// src/game/services/persistence.ts
import type { GameState } from '../core';

const SAVE_KEY = 'pwa-2048.save.v1';

export function saveGame(state: GameState) {
  try {
    const payload = JSON.stringify(state);
    localStorage.setItem(SAVE_KEY, payload);
  } catch {}
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

export function clearGame() {
  try { localStorage.removeItem(SAVE_KEY); } catch {}
}
