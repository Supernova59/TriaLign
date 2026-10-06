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
});

describe('normalizeSequenceInput', () => {
  it('accepte une séquence brute et un en-tête FASTA', () => {
    expect(normalizeSequenceInput(' ac gt\n')).toBe('ACGT');
    expect(normalizeSequenceInput('>sequence 1\nacgt')).toBe('ACGT');
  });
});
