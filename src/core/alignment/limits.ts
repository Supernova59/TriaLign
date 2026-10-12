// Limites de taille : le calcul se fait dans le navigateur, donc la mémoire est comptée.
// Pour trois séquences, le cube contient (n+1) × (m+1) × (p+1) cases :
// 30 millions de cases ≈ 60 Mo (scores en Int16) à 120 Mo (scores en Int32).
export const MAX_TRIPLE_CELLS = 30_000_000;

// Pour deux séquences, la matrice est plus légère mais stockée en tableaux imbriqués.
export const MAX_PAIRWISE_CELLS = 25_000_000;

export class AlignmentTooLargeError extends Error {
  readonly cells: number;
  readonly maxCells: number;

  constructor(message: string, cells: number, maxCells: number) {
    super(message);
    this.name = 'AlignmentTooLargeError';
    this.cells = cells;
    this.maxCells = maxCells;
  }
}

export interface SizeCheck {
  ok: boolean;
  cells: number;
  maxCells: number;
  message?: string;
}

const millions = (cells: number) => `${(cells / 1_000_000).toFixed(1)} millions`;

export function tripleCells(first: number, second: number, third: number): number {
  return (first + 1) * (second + 1) * (third + 1);
}

export function checkTripleSize(
  first: number,
  second: number,
  third: number,
  maxCells = MAX_TRIPLE_CELLS,
): SizeCheck {
  const cells = tripleCells(first, second, third);
  if (cells <= maxCells) return { ok: true, cells, maxCells };
  const equalLength = Math.max(0, Math.floor(Math.cbrt(maxCells)) - 1);
  return {
    ok: false,
    cells,
    maxCells,
    message:
      `Le cube de calcul compterait ${millions(cells)} de cases (maximum : ${millions(maxCells)}). ` +
      `Pour trois séquences de même longueur, la limite est d'environ ${equalLength} résidus.`,
  };
}

export function checkPairwiseSize(
  first: number,
  second: number,
  maxCells = MAX_PAIRWISE_CELLS,
): SizeCheck {
  const cells = (first + 1) * (second + 1);
  if (cells <= maxCells) return { ok: true, cells, maxCells };
  return {
    ok: false,
    cells,
    maxCells,
    message:
      `La matrice compterait ${millions(cells)} de cases (maximum : ${millions(maxCells)}). ` +
      `Raccourcis une des deux séquences.`,
  };
}
