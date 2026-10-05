import type { PairwiseAlignment, Scoring } from '../types';
import { defaultScoring, scorePair } from './scoring';

export function globalAlignment(
  first: string,
  second: string,
  scoring: Scoring = defaultScoring,
): PairwiseAlignment {
  const scores = Array.from({ length: first.length + 1 }, () =>
    Array<number>(second.length + 1).fill(0),
  );

  for (let i = 1; i <= first.length; i += 1) scores[i][0] = i * scoring.gap;
  for (let j = 1; j <= second.length; j += 1) scores[0][j] = j * scoring.gap;

  for (let i = 1; i <= first.length; i += 1) {
    for (let j = 1; j <= second.length; j += 1) {
      scores[i][j] = Math.max(
        scores[i - 1][j - 1] + scorePair(first[i - 1], second[j - 1], scoring),
        scores[i - 1][j] + scoring.gap,
        scores[i][j - 1] + scoring.gap,
      );
    }
  }

  let alignedFirst = '';
  let alignedSecond = '';
  let i = first.length;
  let j = second.length;

  while (i > 0 || j > 0) {
    if (
      i > 0 &&
      j > 0 &&
      scores[i][j] === scores[i - 1][j - 1] + scorePair(first[i - 1], second[j - 1], scoring)
    ) {
      alignedFirst = first[i - 1] + alignedFirst;
      alignedSecond = second[j - 1] + alignedSecond;
      i -= 1;
      j -= 1;
    } else if (i > 0 && scores[i][j] === scores[i - 1][j] + scoring.gap) {
      alignedFirst = first[i - 1] + alignedFirst;
      alignedSecond = '-' + alignedSecond;
      i -= 1;
    } else {
      alignedFirst = '-' + alignedFirst;
      alignedSecond = second[j - 1] + alignedSecond;
      j -= 1;
    }
  }

  return { first: alignedFirst, second: alignedSecond, score: scores[first.length][second.length] };
}
