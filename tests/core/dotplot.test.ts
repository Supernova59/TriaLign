import { describe, expect, it } from 'vitest';
import { dotplotPoints } from '../../src/core/dotplot/kmers';

const toPairs = (points: Uint32Array) => {
  const pairs: string[] = [];
  for (let p = 0; p < points.length; p += 2) pairs.push(`${points[p]},${points[p + 1]}`);
  return pairs;
};

// Version naïve et lente, indépendante de l'implémentation : on compare toutes les paires de positions.
function naive(first: string, second: string, k: number): string[] {
  const pairs: string[] = [];
  for (let i = 0; i + k <= first.length; i++) {
    for (let j = 0; j + k <= second.length; j++) {
      if (first.slice(i, i + k) === second.slice(j, j + k)) pairs.push(`${i},${j}`);
    }
  }
  return pairs;
}

const rnd = (n: number, alphabet = 'ACGT') =>
  Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');

describe('dotplotPoints', () => {
  it('une séquence contre elle-même contient toute la diagonale', () => {
    const sequence = 'ACGTTGCAAC';
    const k = 3;
    const pairs = new Set(toPairs(dotplotPoints(sequence, sequence, k).points));
    for (let i = 0; i + k <= sequence.length; i++) expect(pairs.has(`${i},${i}`)).toBe(true);
  });

  it('une séquence contre son inverse donne une anti-diagonale (k = 1)', () => {
    const { points, count } = dotplotPoints('ABCDEF', 'FEDCBA', 1);
    expect(count).toBe(6);
    for (let p = 0; p < points.length; p += 2) expect(points[p] + points[p + 1]).toBe(5);
  });

  it('des séquences sans rien en commun ne donnent aucun point', () => {
    const result = dotplotPoints('AAAA', 'CCCC', 2);
    expect(result.count).toBe(0);
    expect(result.truncated).toBe(false);
  });

  it('compte toutes les combinaisons quand un k-mer se répète', () => {
    // « AA » apparaît 3 fois dans AAAA et 2 fois dans AAA : 3 × 2 points.
    expect(dotplotPoints('AAAA', 'AAA', 2).count).toBe(6);
  });

  it('renvoie un résultat vide si k dépasse la longueur d\'une séquence', () => {
    expect(dotplotPoints('ACG', 'ACGTACGT', 4).count).toBe(0);
    expect(dotplotPoints('', 'ACGT', 1).count).toBe(0);
  });

  it('tronque proprement quand il y a trop de points', () => {
    const result = dotplotPoints('A'.repeat(20), 'A'.repeat(20), 1, 50);
    expect(result.count).toBe(50);
    expect(result.points.length).toBe(100);
    expect(result.total).toBe(400);
    expect(result.truncated).toBe(true);
  });

  it('refuse un k invalide', () => {
    expect(() => dotplotPoints('ACGT', 'ACGT', 0)).toThrow(RangeError);
    expect(() => dotplotPoints('ACGT', 'ACGT', 1.5)).toThrow(RangeError);
  });

  it('donne exactement les mêmes points que la version naïve (200 cas aléatoires)', () => {
    for (let t = 0; t < 200; t++) {
      const alphabet = t % 2 === 0 ? 'ACGT' : 'ACDEFGHIKLMNPQRSTVWY';
      const first = rnd(Math.floor(Math.random() * 30), alphabet);
      const second = rnd(Math.floor(Math.random() * 30), alphabet);
      const k = 1 + Math.floor(Math.random() * 4);
      const result = dotplotPoints(first, second, k);
      expect(toPairs(result.points)).toEqual(naive(first, second, k));
      expect(result.total).toBe(result.count);
    }
  });
});
