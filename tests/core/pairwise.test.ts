import { describe, expect, it } from 'vitest';
import {
  globalAlignment,
  localAlignment,
  semiGlobalAlignment,
} from '../../src/core/alignment/pairwise';
import { tripleAlignment } from '../../src/core/alignment/triple';
import { normalizeSequenceInput } from '../../src/data/fasta';

describe('globalAlignment', () => {
  it('aligne deux séquences et conserve leur score optimal', () => {
    const result = globalAlignment('ACGT', 'AGT');

    expect(result.first.length).toBe(result.second.length);
    expect(result.first.replaceAll('-', '')).toBe('ACGT');
    expect(result.second.replaceAll('-', '')).toBe('AGT');
    expect(result.score).toBe(2);
  });
});

describe('localAlignment', () => {
  it('retient la meilleure région commune', () => {
    const result = localAlignment('TTACGTAA', 'GGACGTTT');

    expect(result.first).toBe('ACGT');
    expect(result.second).toBe('ACGT');
    expect(result.score).toBe(4);
  });
});

describe('semiGlobalAlignment', () => {
  it('ignore les gaps aux extrémités', () => {
    const result = semiGlobalAlignment('TTACGT', 'ACGTAA');

    expect(result.first.replaceAll('-', '')).toBe('TTACGT');
    expect(result.second.replaceAll('-', '')).toBe('ACGTAA');
    expect(result.score).toBe(4);
  });
});

describe('tripleAlignment', () => {
  it('aligne trois séquences identiques', () => {
    const result = tripleAlignment('AC', 'AC', 'AC');

    expect(result.sequences).toEqual(['AC', 'AC', 'AC']);
    expect(result.score).toBe(6);
  });

  it('insère des gaps pour préserver les blocs homologues', () => {
    const result = tripleAlignment(
      'ATGGCCATTGTAATGGGCCG',
      'ATGGCCATTATAATGGTCCG',
      'ATGGCCGTTGTAATGGGCAG',
    );

    expect(result.sequences.every((sequence) => sequence.length === result.sequences[0].length)).toBe(
      true,
    );
    expect(result.sequences.some((sequence) => sequence.includes('-'))).toBe(true);
    expect(result.sequences.map((sequence) => sequence.replaceAll('-', ''))).toEqual([
      'ATGGCCATTGTAATGGGCCG',
      'ATGGCCATTATAATGGTCCG',
      'ATGGCCGTTGTAATGGGCAG',
    ]);
    expect(result.score).toBeGreaterThan(44);
  });

  it('conserve le même score quelle que soit la permutation des séquences', () => {
    const sequences = ['A', 'AA', ''];
    const permutations = [
      [0, 1, 2],
      [0, 2, 1],
      [1, 0, 2],
      [1, 2, 0],
      [2, 0, 1],
      [2, 1, 0],
    ];
    const scores = permutations.map(([first, second, third]) =>
      tripleAlignment(sequences[first], sequences[second], sequences[third]).score,
    );

    expect(new Set(scores).size).toBe(1);
  });

  it('atteint le score optimal sur de petites séquences', () => {
    const scoreColumn = (first: string, second: string, third: string): number => {
      const characters = [first, second, third];
      return characters.reduce(
        (score, character, index) =>
          score +
          characters.slice(index + 1).reduce((pairScore, other) => {
            if (character === '-' || other === '-') return pairScore;
            return pairScore + (character === other ? 1 : -1);
          }, 0),
        0,
      );
    };
    const bruteForce = (first: string, second: string, third: string): number => {
      const search = (i: number, j: number, k: number): number => {
        if (i === first.length && j === second.length && k === third.length) return 0;
        let best = Number.NEGATIVE_INFINITY;
        for (const [di, dj, dk] of [
          [1, 1, 1],
          [1, 1, 0],
          [1, 0, 1],
          [0, 1, 1],
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ]) {
          if (
            (di && i === first.length) ||
            (dj && j === second.length) ||
            (dk && k === third.length)
          ) {
            continue;
          }
          best = Math.max(
            best,
            scoreColumn(
              di ? first[i] : '-',
              dj ? second[j] : '-',
              dk ? third[k] : '-',
            ) + search(i + di, j + dj, k + dk),
          );
        }
        return best;
      };
      return search(0, 0, 0);
    };

    for (const [first, second, third] of [
      ['A', 'AA', ''],
      ['AC', 'A', 'C'],
      ['AB', 'BA', 'A'],
    ]) {
      expect(tripleAlignment(first, second, third).score).toBe(
        bruteForce(first, second, third),
      );
    }
  });
});

describe('normalizeSequenceInput', () => {
  it('accepte une séquence brute et un en-tête FASTA', () => {
    expect(normalizeSequenceInput(' ac gt\n')).toBe('ACGT');
    expect(normalizeSequenceInput('>sequence 1\nacgt')).toBe('ACGT');
  });
});
