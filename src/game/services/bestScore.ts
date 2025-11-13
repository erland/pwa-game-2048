// src/game/services/bestScore.ts

const BEST_KEY = 'pwa-2048.best.v1';

export function loadBest(): number {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function saveBest(value: number) {
  try {
    const safe = Math.max(0, Math.floor(value));
    localStorage.setItem(BEST_KEY, String(safe));
  } catch {
    // ignore storage errors
  }
}