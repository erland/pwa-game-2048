import { nextRng, nextInt, chance, normalizeSeed } from '..';

describe('rng determinism and helpers', () => {
  it('produces repeatable sequences for a fixed seed', () => {
    const seed = normalizeSeed(123456);
    const seq1: number[] = [];
    const seq2: number[] = [];
    let s1 = seed, s2 = seed;
    for (let i=0; i<10; i++) {
      const a = nextInt(s1, 1000); s1 = a.state; seq1.push(a.value);
      const b = nextInt(s2, 1000); s2 = b.state; seq2.push(b.value);
    }
    expect(seq1).toEqual(seq2);
  });

  it('chance() roughly hits the requested probability', () => {
    const seed = normalizeSeed(42);
    let s = seed;
    let hits = 0, N = 2000;
    for (let i=0; i<N; i++) {
      const res = chance(s, 0.9);
      if (res.hit) hits++;
      s = res.state;
    }
    const p = hits / N;
    expect(p).toBeGreaterThan(0.85);
    expect(p).toBeLessThan(0.95);
  });
});
