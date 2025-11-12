// src/game/core/merge.ts

/** Slide all non-zero tiles to the left and merge equal adjacent tiles once.
 * Returns the new row and the gained score from merges.
 */
export function slideAndMerge(row: number[]): { row: number[]; gainedScore: number } {
  const n = row.length;
  const compact = row.filter(v => v !== 0);
  const out: number[] = [];
  let score = 0;

  for (let i = 0; i < compact.length; i++) {
    const v = compact[i];
    const next = compact[i + 1];
    if (next !== undefined && next === v) {
      const merged = v * 2;
      out.push(merged);
      score += merged;
      i += 1; // skip next; one merge per tile per move
    } else {
      out.push(v);
    }
  }

  while (out.length < n) out.push(0);
  return { row: out, gainedScore: score };
}
