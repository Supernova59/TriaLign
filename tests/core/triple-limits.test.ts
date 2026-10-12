import { describe, expect, it } from 'vitest';
import { tripleAlignment } from '../../src/core/alignment/triple';
import { AlignmentTooLargeError, checkPairwiseSize, checkTripleSize } from '../../src/core/alignment/limits';
import type { Scoring } from '../../src/core/types';

// Force brute indépendante de l'implémentation, avec un score réglable.
function brute(a: string, b: string, c: string, s: Scoring): number {
  const pair = (x: string, y: string) =>
    x === '-' && y === '-' ? 0 : x === '-' || y === '-' ? s.gap : x === y ? s.match : s.mismatch;
  const memo = new Map<string, number>();
  const go = (i: number, j: number, k: number): number => {
    if (i === a.length && j === b.length && k === c.length) return 0;
    const key = `${i},${j},${k}`;
    if (memo.has(key)) return memo.get(key)!;
    let best = -Infinity;
    for (let m = 1; m < 8; m++) {
      const di = m & 1, dj = (m >> 1) & 1, dk = (m >> 2) & 1;
      if ((di && i === a.length) || (dj && j === b.length) || (dk && k === c.length)) continue;
      const x = di ? a[i] : '-', y = dj ? b[j] : '-', z = dk ? c[k] : '-';
      best = Math.max(best, pair(x, y) + pair(x, z) + pair(y, z) + go(i + di, j + dj, k + dk));
    }
    memo.set(key, best);
    return best;
  };
  return go(0, 0, 0);
}

const rnd = (n: number) => Array.from({ length: n }, () => 'ACGT'[Math.floor(Math.random() * 4)]).join('');

describe('limites de taille', () => {
  it('refuse un cube trop grand avec une erreur explicite', () => {
    expect(() => tripleAlignment('ACGT', 'ACGT', 'ACGT', undefined, { maxCells: 50 })).toThrow(AlignmentTooLargeError);
  });

  it('accepte un cube qui tient pile dans la limite', () => {
    expect(() => tripleAlignment('ACGT', 'ACGT', 'ACGT', undefined, { maxCells: 125 })).not.toThrow();
  });

  it('checkTripleSize et checkPairwiseSize donnent un message quand c\'est trop grand', () => {
    expect(checkTripleSize(10, 10, 10).ok).toBe(true);
    const tooBig = checkTripleSize(1000, 1000, 1000);
    expect(tooBig.ok).toBe(false);
    expect(tooBig.message).toContain('maximum');
    expect(checkPairwiseSize(10_000, 10_000).ok).toBe(false);
  });
});

describe('progression', () => {
  it('est croissante et se termine à 1', () => {
    const values: number[] = [];
    tripleAlignment('ACGTAC', 'AGTA', 'ACCT', undefined, { onProgress: (f) => values.push(f) });
    expect(values).toHaveLength(7); // une valeur par tranche : 6 + 1
    expect(values.at(-1)).toBe(1);
    expect([...values].sort((x, y) => x - y)).toEqual(values);
  });
});

describe('scores personnalisés (types de tableaux différents)', () => {
  const cases: Array<[string, Scoring]> = [
    ['entiers petits (Int16)', { match: 2, mismatch: -3, gap: -4 }],
    ['grands entiers (Int32)', { match: 20_000, mismatch: -30_000, gap: -40_000 }],
    ['décimaux (Float64)', { match: 1.5, mismatch: -0.5, gap: -2.25 }],
  ];

  for (const [name, scoring] of cases) {
    it(`${name} : score = force brute`, () => {
      for (let t = 0; t < 60; t++) {
        const s = [rnd(Math.floor(Math.random() * 6)), rnd(Math.floor(Math.random() * 6)), rnd(Math.floor(Math.random() * 6))];
        const result = tripleAlignment(s[0], s[1], s[2], scoring);
        expect(result.score).toBeCloseTo(brute(s[0], s[1], s[2], scoring), 9);
        result.sequences.forEach((aligned, index) => expect(aligned.replaceAll('-', '')).toBe(s[index]));
      }
    });
  }
});
