import type { Scoring } from '../types';
import { defaultScoring } from './scoring';
import { checkTripleSize, AlignmentTooLargeError, MAX_TRIPLE_CELLS } from './limits';

export interface TripleAlignment {
  sequences: [string, string, string];
  score: number;
}

export interface TripleOptions {
  /** Appelé après chaque « tranche » du cube, avec une valeur entre 0 et 1. */
  onProgress?: (fraction: number) => void;
  /** Nombre maximal de cases du cube (par défaut MAX_TRIPLE_CELLS). */
  maxCells?: number;
}

type ScoreArray = Int16Array | Int32Array | Float64Array;

// Les scores sont stockés dans UN seul tableau typé, à plat (au lieu de tableaux imbriqués) :
// beaucoup moins de mémoire et bien plus rapide. On choisit le type le plus petit possible.
function allocateScores(cells: number, scoring: Scoring, totalLength: number): ScoreArray {
  const values = [scoring.match, scoring.mismatch, scoring.gap];
  if (!values.every(Number.isInteger)) return new Float64Array(cells);
  const maxAbs = Math.max(...values.map(Math.abs));
  // Chaque colonne vaut au plus 3 × maxAbs en valeur absolue, et il y a au plus
  // (n + m + p) colonnes : si cette borne tient sur 16 bits, Int16Array suffit.
  const bound = 3 * maxAbs * totalLength;
  return bound <= 32767 ? new Int16Array(cells) : new Int32Array(cells);
}

// Ordre de test pour reconstruire le chemin (même priorité que la version d'origine) :
// les 3 séquences avancent, puis (1,2), (1,3), (2,3), puis une seule.
// Chaque entrée est un masque de bits : bit 0 = séquence 1, bit 1 = séquence 2, bit 2 = séquence 3.
const TRACEBACK_ORDER = [7, 3, 5, 6, 1, 2, 4];

export function tripleAlignment(
  first: string,
  second: string,
  third: string,
  scoring: Scoring = defaultScoring,
  options: TripleOptions = {},
): TripleAlignment {
  const n = first.length;
  const m = second.length;
  const p = third.length;
  const maxCells = options.maxCells ?? MAX_TRIPLE_CELLS;

  const size = checkTripleSize(n, m, p, maxCells);
  if (!size.ok) throw new AlignmentTooLargeError(size.message ?? 'Alignement trop grand', size.cells, maxCells);

  // 1) Chaque caractère devient un petit entier ; le code « gap » est le dernier.
  const alphabet = new Map<string, number>();
  const encode = (text: string) => {
    const codes = new Uint16Array(text.length);
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      let code = alphabet.get(char);
      if (code === undefined) {
        code = alphabet.size;
        alphabet.set(char, code);
      }
      codes[index] = code;
    }
    return codes;
  };
  const codesA = encode(first);
  const codesB = encode(second);
  const codesC = encode(third);
  const GAP = alphabet.size;
  const width = GAP + 1;

  // 2) Table des scores pour une paire de symboles (gap-gap = 0, gap-lettre = gap, sinon match/mismatch).
  const pairTable = new Float64Array(width * width);
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < width; y += 1) {
      pairTable[x * width + y] =
        x === GAP && y === GAP ? 0 : x === GAP || y === GAP ? scoring.gap : x === y ? scoring.match : scoring.mismatch;
    }
  }

  // 3) Remplissage du cube. Il y a 7 mouvements possibles (avancer dans 1, 2 ou 3 séquences).
  const strideI = (m + 1) * (p + 1);
  const strideJ = p + 1;
  const scores = allocateScores(size.cells, scoring, n + m + p);

  for (let i = 0; i <= n; i += 1) {
    for (let j = 0; j <= m; j += 1) {
      for (let k = 0; k <= p; k += 1) {
        if (i === 0 && j === 0 && k === 0) continue; // scores[0] = 0 par défaut

        const x = i > 0 ? codesA[i - 1] : GAP;
        const y = j > 0 ? codesB[j - 1] : GAP;
        const z = k > 0 ? codesC[k - 1] : GAP;
        const index = i * strideI + j * strideJ + k;

        let best = -Infinity;
        for (let move = 1; move < 8; move += 1) {
          const di = move & 1;
          const dj = (move >> 1) & 1;
          const dk = (move >> 2) & 1;
          if ((di && i === 0) || (dj && j === 0) || (dk && k === 0)) continue;
          const px = di ? x : GAP;
          const py = dj ? y : GAP;
          const pz = dk ? z : GAP;
          const value =
            scores[index - di * strideI - dj * strideJ - dk] +
            pairTable[px * width + py] +
            pairTable[px * width + pz] +
            pairTable[py * width + pz];
          if (value > best) best = value;
        }
        scores[index] = best;
      }
    }
    options.onProgress?.((i + 1) / (n + 1));
  }

  // 4) Reconstruction du chemin optimal en remontant depuis la dernière case.
  const outA: string[] = [];
  const outB: string[] = [];
  const outC: string[] = [];
  let i = n;
  let j = m;
  let k = p;

  while (i > 0 || j > 0 || k > 0) {
    const index = i * strideI + j * strideJ + k;
    let found = false;

    for (const move of TRACEBACK_ORDER) {
      const di = move & 1;
      const dj = (move >> 1) & 1;
      const dk = (move >> 2) & 1;
      if ((di && i === 0) || (dj && j === 0) || (dk && k === 0)) continue;
      const px = di ? codesA[i - 1] : GAP;
      const py = dj ? codesB[j - 1] : GAP;
      const pz = dk ? codesC[k - 1] : GAP;
      const value =
        scores[index - di * strideI - dj * strideJ - dk] +
        pairTable[px * width + py] +
        pairTable[px * width + pz] +
        pairTable[py * width + pz];
      if (scores[index] === value) {
        outA.push(di ? first[i - 1] : '-');
        outB.push(dj ? second[j - 1] : '-');
        outC.push(dk ? third[k - 1] : '-');
        i -= di;
        j -= dj;
        k -= dk;
        found = true;
        break;
      }
    }

    if (!found) throw new Error('Unable to reconstruct the optimal triple alignment');
  }

  return {
    sequences: [outA.reverse().join(''), outB.reverse().join(''), outC.reverse().join('')],
    score: scores[n * strideI + m * strideJ + p],
  };
}
