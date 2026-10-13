// Dotplot par k-mers communs : un point (i, j) signifie que les k lettres qui commencent
// à la position i de la séquence 1 sont identiques à celles qui commencent à la position j
// de la séquence 2 (positions comptées à partir de 0).
//
// Une diagonale pleine = une région similaire. Un k plus grand réduit le bruit :
// avec k = 1 sur de l'ADN, environ 1 case sur 4 s'allume au hasard.

export const DEFAULT_MAX_POINTS = 2_000_000;

export interface DotplotResult {
  /** Paires aplaties [i0, j0, i1, j1, ...], triées par i puis par j. */
  points: Uint32Array;
  /** Nombre de points stockés (points.length / 2). */
  count: number;
  /** Vrai si la séquence contenait plus de points que maxPoints (on garde les premiers). */
  truncated: boolean;
  /** Nombre total de points trouvés, même si on n'en a gardé qu'une partie. */
  total: number;
  k: number;
}

export function dotplotPoints(
  first: string,
  second: string,
  k: number,
  maxPoints = DEFAULT_MAX_POINTS,
): DotplotResult {
  if (!Number.isInteger(k) || k < 1) throw new RangeError('k doit être un entier supérieur ou égal à 1');

  if (first.length < k || second.length < k) {
    return { points: new Uint32Array(0), count: 0, truncated: false, total: 0, k };
  }

  // Index : pour chaque k-mer de la séquence 2, la liste de ses positions.
  const index = new Map<string, number[]>();
  for (let j = 0; j + k <= second.length; j += 1) {
    const kmer = second.slice(j, j + k);
    const positions = index.get(kmer);
    if (positions) positions.push(j);
    else index.set(kmer, [j]);
  }

  // Passe 1 : compter, pour allouer le tableau une seule fois à la bonne taille.
  let total = 0;
  for (let i = 0; i + k <= first.length; i += 1) {
    total += index.get(first.slice(i, i + k))?.length ?? 0;
  }

  const count = Math.min(total, maxPoints);
  const points = new Uint32Array(count * 2);

  // Passe 2 : remplir (on s'arrête dès que maxPoints est atteint).
  let written = 0;
  for (let i = 0; i + k <= first.length && written < count; i += 1) {
    const positions = index.get(first.slice(i, i + k));
    if (!positions) continue;
    for (const j of positions) {
      if (written >= count) break;
      points[written * 2] = i;
      points[written * 2 + 1] = j;
      written += 1;
    }
  }

  return { points, count, truncated: total > count, total, k };
}
