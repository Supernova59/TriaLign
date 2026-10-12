import type { AlignmentRequest, AlignmentResult, WorkerResponse } from './messages';

export class AlignmentCancelledError extends Error {
  constructor() {
    super('Calcul annulé');
    this.name = 'AlignmentCancelledError';
  }
}

export class AlignmentFailedError extends Error {
  readonly tooLarge: boolean;

  constructor(message: string, tooLarge: boolean) {
    super(message);
    this.name = 'AlignmentFailedError';
    this.tooLarge = tooLarge;
  }
}

export interface AlignmentJob {
  promise: Promise<AlignmentResult>;
  cancel: () => void;
}

// Lance un calcul dans un worker dédié. Annuler = arrêter le worker, ce qui libère aussi la mémoire.
export function startAlignment(
  request: Omit<AlignmentRequest, 'id'>,
  onProgress?: (fraction: number) => void,
): AlignmentJob {
  const worker = new Worker(new URL('./alignment.worker.ts', import.meta.url), { type: 'module' });
  let rejectJob: (reason: Error) => void = () => undefined;

  const promise = new Promise<AlignmentResult>((resolve, reject) => {
    rejectJob = reject;
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      if (response.type === 'progress') {
        onProgress?.(response.fraction);
      } else if (response.type === 'result') {
        worker.terminate();
        resolve(response.result);
      } else {
        worker.terminate();
        reject(new AlignmentFailedError(response.message, response.tooLarge));
      }
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new AlignmentFailedError(event.message || 'Erreur dans le worker', false));
    };
    worker.postMessage({ id: 0, ...request } satisfies AlignmentRequest);
  });

  return {
    promise,
    cancel: () => {
      worker.terminate();
      rejectJob(new AlignmentCancelledError());
    },
  };
}
