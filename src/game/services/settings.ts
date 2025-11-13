// src/game/services/settings.ts
export type Settings = {
  size: number;          // 3..6
  target: number;        // 512..4096 (power of two typical)
  reducedMotion: boolean;
  undoEnabled: boolean;
};

const SETTINGS_KEY = 'pwa-2048.settings.v1';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        size: clampInt(parsed.size, 4, 3, 6),
        target: clampInt(parsed.target, 2048, 256, 8192),
        reducedMotion: !!parsed.reducedMotion,
        undoEnabled: parsed.undoEnabled !== false, // default true
      };
    }
  } catch {}
  return { size: 4, target: 2048, reducedMotion: false, undoEnabled: true };
}

export function saveSettings(s: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function clampInt(v: any, def: number, min: number, max: number) {
  v = (v|0);
  if (isNaN(v)) return def;
  return Math.max(min, Math.min(max, v));
}

