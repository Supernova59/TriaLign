import { dotplotPoints } from './kmers';

// Dotpath : on transforme les k-mers communs du dotplot en SEGMENTS similaires.
// Un segment est une portion de la séquence A et une portion de même longueur de la séquence B
// qui se ressemblent lettre à lettre (sans insertion ni délétion à l'intérieur : une insertion
// décale la diagonale et crée un nouveau segment).

export interface Segment {
  /** Positions à partir de 0, bornes comprises. */
  aStart: number;
  aEnd: number;
  bStart: number;
  bEnd: number;
  length: number;
  matches: number;
  /** Part de lettres identiques dans le segment, entre 0 et 1. */
  identity: number;
  /** bStart - aStart : deux segments sur la même diagonale ont la même valeur. */
  diagonal: number;
}

export interface SegmentOptions {
  /** Longueur des k-mers exacts qui servent de points de départ. */
  k: number;
  /** Nombre maximal de lettres « différentes » tolérées entre deux k-mers pour les fusionner. */
  maxGap?: number;
  /** Longueur minimale d'un segment, en lettres (au moins k). */
  minLength?: number;
  /** Identité minimale, entre 0 et 1. */
  minIdentity?: number;
  maxPoints?: number;
}

export interface SegmentResult {
  segments: Segment[];
  /** Vrai si le dotplot sous-jacent a dû être tronqué (trop de points) : le résultat est alors partiel. */
  truncated: boolean;
}

export function findSegments(a: string, b: string, options: SegmentOptions): SegmentResult {
  const { k } = options;
  const maxGap = options.maxGap ?? 2;
  const minLength = options.minLength ?? k;
  const minIdentity = options.minIdentity ?? 0;

  const { points, count, truncated } = dotplotPoints(a, b, k, options.maxPoints);

  // On regroupe les points par diagonale (j - i). Les positions i y arrivent déjà triées.
  const diagonals = new Map<number, number[]>();
  for (let p = 0; p < count; p += 1) {
    const i = points[p * 2];
    const diagonal = points[p * 2 + 1] - i;
    const starts = diagonals.get(diagonal);
    if (starts) starts.push(i);
    else diagonals.set(diagonal, [i]);
  }

  const segments: Segment[] = [];
  const emit = (aStart: number, aEnd: number, diagonal: number) => {
    const length = aEnd - aStart + 1;
    if (length < minLength) return;
    const bStart = aStart + diagonal;
    let matches = 0;
    for (let offset = 0; offset < length; offset += 1) {
      if (a[aStart + offset] === b[bStart + offset]) matches += 1;
    }
    const identity = matches / length;
    if (identity < minIdentity) return;
    segments.push({ aStart, aEnd, bStart, bEnd: bStart + length - 1, length, matches, identity, diagonal });
  };

  for (const [diagonal, starts] of diagonals) {
    let runStart = starts[0];
    let runEnd = starts[0] + k - 1;
    for (let index = 1; index < starts.length; index += 1) {
      const start = starts[index];
      if (start - runEnd - 1 <= maxGap) {
        runEnd = Math.max(runEnd, start + k - 1);
      } else {
        emit(runStart, runEnd, diagonal);
        runStart = start;
        runEnd = start + k - 1;
      }
    }
    emit(runStart, runEnd, diagonal);
  }

  segments.sort((x, y) => x.aStart - y.aStart || x.bStart - y.bStart);
  return { segments, truncated };
}

export interface PairSummary {
  segmentCount: number;
  /** Part de la séquence A couverte par au moins un segment (0 à 1). */
  coverageA: number;
  /** Part de la séquence B couverte par au moins un segment (0 à 1). */
  coverageB: number;
  /** Identité moyenne des segments, pondérée par leur longueur (0 si aucun segment). */
  meanIdentity: number;
}

function coveredLength(intervals: Array<[number, number]>): number {
  const sorted = [...intervals].sort((x, y) => x[0] - y[0]);
  let total = 0;
  let currentStart = -1;
  let currentEnd = -2;
  for (const [start, end] of sorted) {
    if (start > currentEnd + 1) {
      if (currentEnd >= currentStart) total += currentEnd - currentStart + 1;
      currentStart = start;
      currentEnd = end;
    } else if (end > currentEnd) {
      currentEnd = end;
    }
  }
  if (currentEnd >= currentStart) total += currentEnd - currentStart + 1;
  return total;
}

export function summarizePair(segments: Segment[], lengthA: number, lengthB: number): PairSummary {
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
  const totalMatches = segments.reduce((sum, segment) => sum + segment.matches, 0);
  return {
    segmentCount: segments.length,
    coverageA: lengthA ? coveredLength(segments.map((s) => [s.aStart, s.aEnd])) / lengthA : 0,
    coverageB: lengthB ? coveredLength(segments.map((s) => [s.bStart, s.bEnd])) / lengthB : 0,
    meanIdentity: totalLength ? totalMatches / totalLength : 0,
  };
}

export interface PairComparison {
  /** Indices des deux séquences comparées (a < b). */
  a: number;
  b: number;
  segments: Segment[];
  summary: PairSummary;
  truncated: boolean;
}

/** Compare toutes les paires de séquences (1-2, 1-3, 2-3...). */
export function comparePairs(sequences: string[], options: SegmentOptions): PairComparison[] {
  const comparisons: PairComparison[] = [];
  for (let a = 0; a < sequences.length; a += 1) {
    for (let b = a + 1; b < sequences.length; b += 1) {
      const { segments, truncated } = findSegments(sequences[a], sequences[b], options);
      comparisons.push({ a, b, segments, truncated, summary: summarizePair(segments, sequences[a].length, sequences[b].length) });
    }
  }
  return comparisons;
}
