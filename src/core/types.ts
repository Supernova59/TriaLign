export type SequenceKind = 'dna' | 'rna' | 'protein';

export interface Sequence {
  id: string;
  label: string;
  value: string;
  kind?: SequenceKind;
}

export interface Scoring {
  match: number;
  mismatch: number;
  gap: number;
}

export interface PairwiseAlignment {
  first: string;
  second: string;
  score: number;
}
