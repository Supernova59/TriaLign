import type { Scoring } from '../types';
import { defaultScoring, scorePair } from './scoring';

export interface TripleAlignment {
  sequences: [string, string, string];
  score: number;
}

function pairScore(first: string, second: string, scoring: Scoring): number {
  if (first === '-' && second === '-') return 0;
  if (first === '-' || second === '-') return scoring.gap;
  return scorePair(first, second, scoring);
}

function scoreColumn(first: string, second: string, third: string, scoring: Scoring): number {
  return (
    pairScore(first, second, scoring) +
    pairScore(first, third, scoring) +
    pairScore(second, third, scoring)
  );
}

function gapCount(first: string, second: string, third: string): number {
  return first === '-' || second === '-' || third === '-' ? 1 : 0;
}

export function tripleAlignment(
  first: string,
  second: string,
  third: string,
  scoring: Scoring = defaultScoring,
): TripleAlignment {
  // Pour un alignement multiple, les gaps servent à comparer les bases
  // homologues. Ils ne doivent donc pas réduire le score d'identité.
  const identityScoring: Scoring = { ...scoring, gap: 0 };
  const scoreScale = first.length + second.length + third.length + 1;
  const moveScore = (a: string, b: string, c: string) =>
    scoreColumn(a, b, c, identityScoring) * scoreScale - gapCount(a, b, c);

  // Avec trois séquences, on a une matrice 3D au lieu d'une matrice 2D.
  const scores = Array.from({ length: first.length + 1 }, () =>
    Array.from({ length: second.length + 1 }, () =>
      Array<number>(third.length + 1).fill(Number.NEGATIVE_INFINITY),
    ),
  );

  scores[0][0][0] = 0;

  for (let i = 0; i <= first.length; i += 1) {
    for (let j = 0; j <= second.length; j += 1) {
      for (let k = 0; k <= third.length; k += 1) {
        if (i === 0 && j === 0 && k === 0) continue;

        // Il existe 7 mouvements possibles : avancer dans 1, 2 ou 3 séquences.
        const candidates: number[] = [];
        if (i > 0 && j > 0 && k > 0) {
          candidates.push(
            scores[i - 1][j - 1][k - 1] +
            moveScore(first[i - 1], second[j - 1], third[k - 1]),
          );
        }
        if (i > 0 && j > 0) {
          candidates.push(
            scores[i - 1][j - 1][k] +
              moveScore(first[i - 1], second[j - 1], '-'),
          );
        }
        if (i > 0 && k > 0) {
          candidates.push(
            scores[i - 1][j][k - 1] +
              moveScore(first[i - 1], '-', third[k - 1]),
          );
        }
        if (j > 0 && k > 0) {
          candidates.push(
            scores[i][j - 1][k - 1] +
              moveScore('-', second[j - 1], third[k - 1]),
          );
        }
        if (i > 0) {
          candidates.push(
            scores[i - 1][j][k] + moveScore(first[i - 1], '-', '-'),
          );
        }
        if (j > 0) {
          candidates.push(
            scores[i][j - 1][k] + moveScore('-', second[j - 1], '-'),
          );
        }
        if (k > 0) {
          candidates.push(
            scores[i][j][k - 1] + moveScore('-', '-', third[k - 1]),
          );
        }
        scores[i][j][k] = Math.max(...candidates);
      }
    }
  }

  let alignedFirst = '';
  let alignedSecond = '';
  let alignedThird = '';
  let i = first.length;
  let j = second.length;
  let k = third.length;

  // Même principe que pour l'alignement à deux séquences, mais avec 3 chaînes.
  while (i > 0 || j > 0 || k > 0) {
    if (
      i > 0 &&
      j > 0 &&
      k > 0 &&
      scores[i][j][k] ===
        scores[i - 1][j - 1][k - 1] +
        moveScore(first[i - 1], second[j - 1], third[k - 1])
    ) {
      alignedFirst = first[i - 1] + alignedFirst;
      alignedSecond = second[j - 1] + alignedSecond;
      alignedThird = third[k - 1] + alignedThird;
      i -= 1;
      j -= 1;
      k -= 1;
    } else if (
      i > 0 &&
      j > 0 &&
      scores[i][j][k] ===
        scores[i - 1][j - 1][k] +
          moveScore(first[i - 1], second[j - 1], '-')
    ) {
      alignedFirst = first[i - 1] + alignedFirst;
      alignedSecond = second[j - 1] + alignedSecond;
      alignedThird = '-' + alignedThird;
      i -= 1;
      j -= 1;
    } else if (
      i > 0 &&
      k > 0 &&
      scores[i][j][k] ===
        scores[i - 1][j][k - 1] +
          moveScore(first[i - 1], '-', third[k - 1])
    ) {
      alignedFirst = first[i - 1] + alignedFirst;
      alignedSecond = '-' + alignedSecond;
      alignedThird = third[k - 1] + alignedThird;
      i -= 1;
      k -= 1;
    } else if (
      j > 0 &&
      k > 0 &&
      scores[i][j][k] ===
        scores[i][j - 1][k - 1] +
          moveScore('-', second[j - 1], third[k - 1])
    ) {
      alignedFirst = '-' + alignedFirst;
      alignedSecond = second[j - 1] + alignedSecond;
      alignedThird = third[k - 1] + alignedThird;
      j -= 1;
      k -= 1;
    } else if (
      i > 0 &&
      scores[i][j][k] === scores[i - 1][j][k] + moveScore(first[i - 1], '-', '-')
    ) {
      alignedFirst = first[i - 1] + alignedFirst;
      alignedSecond = '-' + alignedSecond;
      alignedThird = '-' + alignedThird;
      i -= 1;
    } else if (
      j > 0 &&
      scores[i][j][k] === scores[i][j - 1][k] + moveScore('-', second[j - 1], '-')
    ) {
      alignedFirst = '-' + alignedFirst;
      alignedSecond = second[j - 1] + alignedSecond;
      alignedThird = '-' + alignedThird;
      j -= 1;
    } else {
      alignedFirst = '-' + alignedFirst;
      alignedSecond = '-' + alignedSecond;
      alignedThird = third[k - 1] + alignedThird;
      k -= 1;
    }
  }

  return {
    sequences: [alignedFirst, alignedSecond, alignedThird],
    score: Math.round(scores[first.length][second.length][third.length] / scoreScale),
  };
}
