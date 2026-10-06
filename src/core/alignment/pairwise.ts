import type { PairwiseAlignment, Scoring } from '../types';
import { defaultScoring, scorePair } from './scoring';

export function globalAlignment(
  first: string,
  second: string,
  scoring: Scoring = defaultScoring,
): PairwiseAlignment {
  // La matrice contient le meilleur score possible pour chaque préfixe.
  const scores = Array.from({ length: first.length + 1 }, () =>
    Array<number>(second.length + 1).fill(0),
  );

  // Au début, il faut forcément placer des gaps pour aligner une séquence vide.
  for (let i = 1; i <= first.length; i += 1) scores[i][0] = i * scoring.gap;
  for (let j = 1; j <= second.length; j += 1) scores[0][j] = j * scoring.gap;

  // Chaque case peut venir d'une diagonale, du haut ou de la gauche.
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

  // On remonte la matrice pour retrouver le chemin qui donne le score optimal.
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

export function localAlignment(
  first: string,
  second: string,
  scoring: Scoring = defaultScoring,
): PairwiseAlignment {
  // Ici, les scores négatifs sont remplacés par zéro : un nouvel alignement
  // local peut donc recommencer à n'importe quelle position.
  const scores = Array.from({ length: first.length + 1 }, () =>
    Array<number>(second.length + 1).fill(0),
  );
  let bestScore = 0;
  let bestI = 0;
  let bestJ = 0;

  for (let i = 1; i <= first.length; i += 1) {
    for (let j = 1; j <= second.length; j += 1) {
      scores[i][j] = Math.max(
        0,
        scores[i - 1][j - 1] + scorePair(first[i - 1], second[j - 1], scoring),
        scores[i - 1][j] + scoring.gap,
        scores[i][j - 1] + scoring.gap,
      );

      // On garde la position de la meilleure cellule pour commencer le traceback.
      if (scores[i][j] > bestScore) {
        bestScore = scores[i][j];
        bestI = i;
        bestJ = j;
      }
    }
  }

  let alignedFirst = '';
  let alignedSecond = '';
  let i = bestI;
  let j = bestJ;

  // Le traceback s'arrête dès que l'alignement local retombe à zéro.
  while (i > 0 && j > 0 && scores[i][j] > 0) {
    if (
      scores[i][j] ===
      scores[i - 1][j - 1] + scorePair(first[i - 1], second[j - 1], scoring)
    ) {
      alignedFirst = first[i - 1] + alignedFirst;
      alignedSecond = second[j - 1] + alignedSecond;
      i -= 1;
      j -= 1;
    } else if (scores[i][j] === scores[i - 1][j] + scoring.gap) {
      alignedFirst = first[i - 1] + alignedFirst;
      alignedSecond = '-' + alignedSecond;
      i -= 1;
    } else {
      alignedFirst = '-' + alignedFirst;
      alignedSecond = second[j - 1] + alignedSecond;
      j -= 1;
    }
  }

  return { first: alignedFirst, second: alignedSecond, score: bestScore };
}

export function semiGlobalAlignment(
  first: string,
  second: string,
  scoring: Scoring = defaultScoring,
): PairwiseAlignment {
  // Les bords restent à zéro pour ne pas pénaliser les débuts de séquence.
  const scores = Array.from({ length: first.length + 1 }, () =>
    Array<number>(second.length + 1).fill(0),
  );

  for (let i = 1; i <= first.length; i += 1) {
    for (let j = 1; j <= second.length; j += 1) {
      scores[i][j] = Math.max(
        scores[i - 1][j - 1] + scorePair(first[i - 1], second[j - 1], scoring),
        scores[i - 1][j] + scoring.gap,
        scores[i][j - 1] + scoring.gap,
      );
    }
  }

  // En semi-global, le meilleur alignement peut se terminer sur le dernier
  // caractère de l'une ou l'autre séquence.
  let endI = first.length;
  let endJ = second.length;
  let bestScore = scores[endI][endJ];

  for (let i = 0; i <= first.length; i += 1) {
    if (scores[i][second.length] > bestScore) {
      bestScore = scores[i][second.length];
      endI = i;
      endJ = second.length;
    }
  }
  for (let j = 0; j <= second.length; j += 1) {
    if (scores[first.length][j] > bestScore) {
      bestScore = scores[first.length][j];
      endI = first.length;
      endJ = j;
    }
  }

  let alignedFirst = first.slice(endI);
  let alignedSecond = '-'.repeat(first.length - endI);
  if (endI < first.length) {
    alignedFirst = first.slice(endI);
    alignedSecond = '-'.repeat(first.length - endI);
  } else {
    alignedFirst = '-'.repeat(second.length - endJ);
    alignedSecond = second.slice(endJ);
  }

  let i = endI;
  let j = endJ;
  let coreFirst = '';
  let coreSecond = '';

  while (i > 0 && j > 0) {
    if (
      scores[i][j] ===
      scores[i - 1][j - 1] + scorePair(first[i - 1], second[j - 1], scoring)
    ) {
      coreFirst = first[i - 1] + coreFirst;
      coreSecond = second[j - 1] + coreSecond;
      i -= 1;
      j -= 1;
    } else if (scores[i][j] === scores[i - 1][j] + scoring.gap) {
      coreFirst = first[i - 1] + coreFirst;
      coreSecond = '-' + coreSecond;
      i -= 1;
    } else {
      coreFirst = '-' + coreFirst;
      coreSecond = second[j - 1] + coreSecond;
      j -= 1;
    }
  }

  // Les morceaux qui restent aux extrémités sont ajoutés sans changer le score.
  const prefixFirst = i > 0 ? first.slice(0, i) : '-'.repeat(j);
  const prefixSecond = j > 0 ? second.slice(0, j) : '-'.repeat(i);

  return {
    first: prefixFirst + coreFirst + alignedFirst,
    second: prefixSecond + coreSecond + alignedSecond,
    score: bestScore,
  };
}
