import { globalAlignment, localAlignment, semiGlobalAlignment } from '../core/alignment/pairwise';
import { tripleAlignment } from '../core/alignment/triple';
import { defaultScoring } from '../core/alignment/scoring';
import { AlignmentTooLargeError, checkPairwiseSize } from '../core/alignment/limits';
import type { AlignmentRequest, WorkerResponse } from './messages';

// Logique du worker, séparée du worker lui-même pour pouvoir la tester sans navigateur.
export function handleRequest(request: AlignmentRequest, post: (response: WorkerResponse) => void): void {
  const { id, method, sequences } = request;
  const scoring = request.scoring ?? defaultScoring;

  try {
    if (method === 'triple') {
      if (sequences.length !== 3) throw new Error('Il faut trois séquences pour cet alignement.');
      const alignment = tripleAlignment(sequences[0], sequences[1], sequences[2], scoring, {
        onProgress: (fraction) => post({ id, type: 'progress', fraction }),
      });
      post({ id, type: 'result', result: { kind: 'triple', alignment } });
      return;
    }

    if (sequences.length !== 2) throw new Error('Il faut deux séquences pour cet alignement.');
    const [first, second] = sequences;
    const size = checkPairwiseSize(first.length, second.length);
    if (!size.ok) throw new AlignmentTooLargeError(size.message ?? 'Alignement trop grand', size.cells, size.maxCells);

    const run = method === 'local' ? localAlignment : method === 'semi-global' ? semiGlobalAlignment : globalAlignment;
    post({ id, type: 'result', result: { kind: 'pairwise', alignment: run(first, second, scoring) } });
  } catch (error) {
    post({
      id,
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
      tooLarge: error instanceof AlignmentTooLargeError,
    });
  }
}
