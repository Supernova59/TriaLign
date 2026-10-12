import { it, expect } from 'vitest';
import { tripleAlignment } from '../../src/core/alignment/triple';
import { defaultScoring } from '../../src/core/alignment/scoring';
 
const pair = (x: string, y: string) =>
  x === '-' && y === '-' ? 0 : x === '-' || y === '-' ? defaultScoring.gap : x === y ? defaultScoring.match : defaultScoring.mismatch;
const col = (a: string, b: string, c: string) => pair(a, b) + pair(a, c) + pair(b, c);
 
function brute(a: string, b: string, c: string): number {
  const memo = new Map<string, number>();
  const go = (i: number, j: number, k: number): number => {
    if (i === a.length && j === b.length && k === c.length) return 0;
    const key = `${i},${j},${k}`;
    if (memo.has(key)) return memo.get(key)!;
    let best = -Infinity;
    for (let m = 1; m < 8; m++) {
      const di = m & 1, dj = (m >> 1) & 1, dk = (m >> 2) & 1;
      if ((di && i === a.length) || (dj && j === b.length) || (dk && k === c.length)) continue;
      best = Math.max(best, col(di ? a[i] : '-', dj ? b[j] : '-', dk ? c[k] : '-') + go(i + di, j + dj, k + dk));
    }
    memo.set(key, best);
    return best;
  };
  return go(0, 0, 0);
}
const rnd = (n: number) => Array.from({ length: n }, () => 'ACGT'[Math.floor(Math.random() * 4)]).join('');
 
it("une substitution isolée ne crée pas de gap", () => {
  const r = tripleAlignment('ACGTACGT', 'ACGTACGT', 'ACGAACGT');
  expect(r.sequences.some((q) => q.includes('-'))).toBe(false);
});
 
it("symétrie, force brute et cohérence du score sur 300 triplets aléatoires", () => {
  for (let t = 0; t < 300; t++) {
    const s = [rnd(Math.floor(Math.random() * 6)), rnd(Math.floor(Math.random() * 6)), rnd(Math.floor(Math.random() * 6))];
    const expected = brute(s[0], s[1], s[2]);
    for (const [x, y, z] of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]]) {
      expect(tripleAlignment(s[x], s[y], s[z]).score).toBe(expected);
    }
    const r = tripleAlignment(s[0], s[1], s[2]);
    r.sequences.forEach((q, idx) => expect(q.replaceAll('-', '')).toBe(s[idx]));
    // le score affiché doit être celui de l'alignement renvoyé
    let sum = 0;
    for (let p = 0; p < r.sequences[0].length; p++) sum += col(r.sequences[0][p], r.sequences[1][p], r.sequences[2][p]);
    expect(sum).toBe(r.score);
  }
});
 