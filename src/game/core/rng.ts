// src/game/core/rng.ts

/** Mulberry32: tiny fast 32-bit PRNG with good enough quality for games. */
export function nextRng(state: number): { value: number; state: number } {
  // Force uint32
  let t = (state + 0x6D2B79F5) >>> 0;
  // Update state for next call
  state = t >>> 0;

  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const v = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value: v, state };
}

/** Returns an integer in [0, maxExclusive). */
export function nextInt(state: number, maxExclusive: number): { value: number; state: number } {
  const { value, state: s2 } = nextRng(state);
  return { value: Math.floor(value * maxExclusive), state: s2 };
}

/** Convenience for coin flips/probabilities. */
export function chance(state: number, p: number): { hit: boolean; state: number } {
  const { value, state: s2 } = nextRng(state);
  return { hit: value < p, state: s2 };
}

/** Normalize/seed helper to get a non-zero uint32 seed/state. */
export function normalizeSeed(seed?: number): number {
  const s = (seed ?? Date.now()) >>> 0;
  return s === 0 ? 0xA5F1523D : s;
}
