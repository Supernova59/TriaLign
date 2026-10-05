import type { Scoring } from '../types';

export const defaultScoring: Scoring = { match: 1, mismatch: -1, gap: -1 };

export function scorePair(a: string, b: string, scoring = defaultScoring): number {
  return a === b ? scoring.match : scoring.mismatch;
}
