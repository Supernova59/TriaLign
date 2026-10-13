import { describe, expect, it } from 'vitest';
import { comparePairs, findSegments, summarizePair, type Segment } from '../../src/core/dotplot/segments';

const key = (s: Segment) => `${s.aStart}-${s.aEnd}-${s.bStart}-${s.bEnd}-${s.matches}`;

// Version naïve et indépendante : on parcourt chaque diagonale lettre par lettre.
function naive(a: string, b: string, k: number, maxGap: number, minLength: number, minIdentity: number): string[] {
  const found: string[] = [];
  for (let d = -(a.length - 1); d <= b.length - 1; d++) {
    const from = Math.max(0, -d);
    const to = Math.min(a.length - 1, b.length - 1 - d);
    const runs: Array<[number, number]> = [];
    for (let i = from; i <= to; ) {
      if (a[i] !== b[i + d]) { i++; continue; }
      let j = i;
      while (j + 1 <= to && a[j + 1] === b[j + 1 + d]) j++;
      if (j - i + 1 >= k) runs.push([i, j]);
      i = j + 1;
    }
    const merged: Array<[number, number]> = [];
    for (const run of runs) {
      const last = merged[merged.length - 1];
      if (last && run[0] - last[1] - 1 <= maxGap) last[1] = run[1];
      else merged.push([run[0], run[1]]);
    }
    for (const [start, end] of merged) {
      const length = end - start + 1;
      let matches = 0;
      for (let t = start; t <= end; t++) if (a[t] === b[t + d]) matches++;
      if (length >= minLength && matches / length >= minIdentity) found.push(`${start}-${end}-${start + d}-${end + d}-${matches}`);
    }
  }
  return found.sort();
}

const rnd = (n: number) => Array.from({ length: n }, () => 'ACGT'[Math.floor(Math.random() * 4)]).join('');

describe('findSegments', () => {
  it('deux séquences identiques donnent un seul segment qui couvre tout', () => {
    const sequence = 'ATGCGTACCGGATTACAGCT';
    const { segments } = findSegments(sequence, sequence, { k: 5 });
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ aStart: 0, aEnd: 19, bStart: 0, bEnd: 19, length: 20, identity: 1, diagonal: 0 });
  });

  it('un décalage donne une autre diagonale', () => {
    const sequence = 'ATGCGTACCGGATTACAGCT';
    const { segments } = findSegments(sequence, 'TTTT' + sequence, { k: 5 });
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ aStart: 0, bStart: 4, diagonal: 4, identity: 1 });
  });

  it('une substitution isolée coupe le segment, sauf si on la tolère', () => {
    const a = 'ATGCGTACCGGATTACAGCT';
    const b = a.slice(0, 10) + (a[10] === 'A' ? 'C' : 'A') + a.slice(11); // 1 lettre changée au milieu
    expect(findSegments(a, b, { k: 4, maxGap: 0 }).segments).toHaveLength(2);

    const merged = findSegments(a, b, { k: 4, maxGap: 1 }).segments;
    expect(merged).toHaveLength(1);
    expect(merged[0].length).toBe(20);
    expect(merged[0].identity).toBeCloseTo(19 / 20);
  });

  it('filtre selon l\'identité et la longueur minimales', () => {
    const a = 'ATGCGTACCGGATTACAGCT';
    const b = a.slice(0, 10) + (a[10] === 'A' ? 'C' : 'A') + a.slice(11);
    expect(findSegments(a, b, { k: 4, maxGap: 1, minIdentity: 0.97 }).segments).toHaveLength(0);
    expect(findSegments(a, b, { k: 4, maxGap: 1, minLength: 25 }).segments).toHaveLength(0);
  });

  it('ne trouve rien entre des séquences sans rapport', () => {
    expect(findSegments('AAAAAAAA', 'CCCCCCCC', { k: 3 }).segments).toEqual([]);
  });

  it('un motif répété donne plusieurs segments parallèles', () => {
    const { segments } = findSegments('GATTACAxxxxxxGATTACA'.replaceAll('x', 'C'), 'GATTACA', { k: 7 });
    expect(segments).toHaveLength(2);
    expect(new Set(segments.map((s) => s.diagonal)).size).toBe(2);
  });

  it('donne les mêmes segments qu\'un calcul naïf (300 cas aléatoires)', () => {
    for (let t = 0; t < 300; t++) {
      const a = rnd(Math.floor(Math.random() * 40));
      const b = rnd(Math.floor(Math.random() * 40));
      const k = 2 + Math.floor(Math.random() * 4);
      const maxGap = Math.floor(Math.random() * 4);
      const minLength = k + Math.floor(Math.random() * 4);
      const minIdentity = [0, 0.6, 0.8][Math.floor(Math.random() * 3)];
      const real = findSegments(a, b, { k, maxGap, minLength, minIdentity }).segments.map(key).sort();
      expect(real).toEqual(naive(a, b, k, maxGap, minLength, minIdentity));
    }
  });
});

describe('summarizePair', () => {
  const segment = (aStart: number, aEnd: number, bStart: number, matches: number): Segment => ({
    aStart, aEnd, bStart, bEnd: bStart + (aEnd - aStart), length: aEnd - aStart + 1, matches, identity: matches / (aEnd - aStart + 1), diagonal: bStart - aStart,
  });

  it('compte une seule fois les zones qui se recouvrent', () => {
    const summary = summarizePair([segment(0, 9, 0, 10), segment(5, 14, 20, 10)], 20, 40);
    expect(summary.coverageA).toBeCloseTo(15 / 20);
    expect(summary.coverageB).toBeCloseTo(20 / 40);
    expect(summary.segmentCount).toBe(2);
  });

  it('moyenne l\'identité en tenant compte des longueurs', () => {
    const summary = summarizePair([segment(0, 9, 0, 10), segment(20, 39, 20, 15)], 40, 40);
    expect(summary.meanIdentity).toBeCloseTo(25 / 30);
  });

  it('gère l\'absence de segments', () => {
    expect(summarizePair([], 10, 10)).toEqual({ segmentCount: 0, coverageA: 0, coverageB: 0, meanIdentity: 0 });
  });
});

describe('comparePairs', () => {
  it('compare toutes les paires de trois séquences', () => {
    const pairs = comparePairs(['ACGTACGTAC', 'ACGTACGTAC', 'ACGTACGTAC'], { k: 4 });
    expect(pairs.map((p) => [p.a, p.b])).toEqual([[0, 1], [0, 2], [1, 2]]);
    expect(pairs.every((p) => p.summary.coverageA === 1)).toBe(true);
  });
});
