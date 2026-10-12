import type { PairwiseAlignment, Scoring } from '../core/types';
import type { TripleAlignment } from '../core/alignment/triple';

export type AlignmentMethod = 'global' | 'local' | 'semi-global' | 'triple';

export interface AlignmentRequest {
  id: number;
  method: AlignmentMethod;
  /** 2 séquences pour les méthodes 1v1, 3 pour « triple ». */
  sequences: string[];
  scoring?: Scoring;
}

export type AlignmentResult =
  | { kind: 'pairwise'; alignment: PairwiseAlignment }
  | { kind: 'triple'; alignment: TripleAlignment };

export type WorkerResponse =
  | { id: number; type: 'progress'; fraction: number }
  | { id: number; type: 'result'; result: AlignmentResult }
  | { id: number; type: 'error'; message: string; tooLarge: boolean };
