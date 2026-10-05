import { describe, expect, it } from 'vitest';
import { globalAlignment } from '../../src/core/alignment/pairwise';
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

describe('normalizeSequenceInput', () => {
  it('accepte une séquence brute et un en-tête FASTA', () => {
    expect(normalizeSequenceInput(' ac gt\n')).toBe('ACGT');
    expect(normalizeSequenceInput('>sequence 1\nacgt')).toBe('ACGT');
  });
});
