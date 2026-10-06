import type { Scoring } from '../types';
import { defaultScoring, scorePair } from './scoring';

export interface TripleAlignment {
  sequences: [string, string, string];
  score: number;
}

function scoreColumn(first: string, second: string, third: string, scoring: Scoring): number {
  // Le score d'une colonne est la somme des scores de chaque paire réelle.
  // Une paire de deux gaps ne compte pas.
  let score = 0;
  if (first !== '-' && second !== '-') score += scorePair(first, second, scoring);
  if (first !== '-' && third !== '-') score += scorePair(first, third, scoring);
  if (second !== '-' && third !== '-') score += scorePair(second, third, scoring);
  if (first === '-' && second !== '-') score += scoring.gap;
  if (first === '-' && third !== '-') score += scoring.gap;
  if (second === '-' && third !== '-') score += scoring.gap;
  return score;
}

export function tripleAlignment(
  first: string,
  second: string,
  third: string,
  scoring: Scoring = defaultScoring,
): TripleAlignment {
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
              scoreColumn(first[i - 1], second[j - 1], third[k - 1], scoring),
          );
        }
        if (i > 0 && j > 0) {
          candidates.push(
            scores[i - 1][j - 1][k] + scoreColumn(first[i - 1], second[j - 1], '-', scoring),
          );
        }
        if (i > 0 && k > 0) {
          candidates.push(
            scores[i - 1][j][k - 1] + scoreColumn(first[i - 1], '-', third[k - 1], scoring),
          );
        }
        if (j > 0 && k > 0) {
          candidates.push(
            scores[i][j - 1][k - 1] + scoreColumn('-', second[j - 1], third[k - 1], scoring),
          );
        }
        if (i > 0) {
          candidates.push(scores[i - 1][j][k] + scoreColumn(first[i - 1], '-', '-', scoring));
        }
        if (j > 0) {
          candidates.push(scores[i][j - 1][k] + scoreColumn('-', second[j - 1], '-', scoring));
        }
        if (k > 0) {
          candidates.push(scores[i][j][k - 1] + scoreColumn('-', '-', third[k - 1], scoring));
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
          scoreColumn(first[i - 1], second[j - 1], third[k - 1], scoring)
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
        scores[i - 1][j - 1][k] + scoreColumn(first[i - 1], second[j - 1], '-', scoring)
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
        scores[i - 1][j][k - 1] + scoreColumn(first[i - 1], '-', third[k - 1], scoring)
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
        scores[i][j - 1][k - 1] + scoreColumn('-', second[j - 1], third[k - 1], scoring)
    ) {
      alignedFirst = '-' + alignedFirst;
      alignedSecond = second[j - 1] + alignedSecond;
      alignedThird = third[k - 1] + alignedThird;
      j -= 1;
      k -= 1;
    } else if (
      i > 0 &&
      scores[i][j][k] === scores[i - 1][j][k] + scoreColumn(first[i - 1], '-', '-', scoring)
    ) {
      alignedFirst = first[i - 1] + alignedFirst;
      alignedSecond = '-' + alignedSecond;
      alignedThird = '-' + alignedThird;
      i -= 1;
    } else if (
      j > 0 &&
      scores[i][j][k] === scores[i][j - 1][k] + scoreColumn('-', second[j - 1], '-', scoring)
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
    score: scores[first.length][second.length][third.length],
  };
}
