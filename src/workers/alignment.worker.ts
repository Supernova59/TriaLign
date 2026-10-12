// Point d'entrée du Web Worker : le calcul tourne ici, hors du thread de l'interface.
import { handleRequest } from './handler';
import type { AlignmentRequest, WorkerResponse } from './messages';

// Le projet utilise la lib « DOM » : on décrit à la main la partie du worker dont on a besoin.
interface WorkerScope {
  onmessage: ((event: MessageEvent<AlignmentRequest>) => void) | null;
  postMessage(message: WorkerResponse): void;
}

const scope = self as unknown as WorkerScope;
scope.onmessage = (event) => handleRequest(event.data, (response) => scope.postMessage(response));
