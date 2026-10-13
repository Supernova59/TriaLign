// Outils communs aux imports de séquences depuis des bases en ligne (NCBI, UniProt).

export type RemoteErrorKind = 'invalid-id' | 'not-found' | 'rate-limit' | 'network' | 'too-large' | 'server';

export class RemoteFetchError extends Error {
  readonly kind: RemoteErrorKind;

  constructor(kind: RemoteErrorKind, message: string) {
    super(message);
    this.name = 'RemoteFetchError';
    this.kind = kind;
  }
}

export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

/** Fetch du navigateur, enveloppé pour éviter les soucis de « this » et pour pouvoir le remplacer dans les tests. */
export const defaultFetcher: Fetcher = (input, init) => fetch(input, init);

export const DEFAULT_MAX_BYTES = 2_000_000;

function tooLarge(maxBytes: number) {
  return new RemoteFetchError(
    'too-large',
    `La réponse dépasse ${(maxBytes / 1_000_000).toFixed(0)} Mo : cette séquence est trop longue pour être chargée en entier.`,
  );
}

/** Lit le texte d'une réponse en s'arrêtant dès que la taille maximale est dépassée (évite de télécharger un chromosome). */
export async function readTextLimited(response: Response, maxBytes = DEFAULT_MAX_BYTES): Promise<string> {
  const declared = Number(response.headers.get('content-length'));
  if (declared > maxBytes) throw tooLarge(maxBytes);

  if (!response.body) {
    const text = await response.text();
    if (text.length > maxBytes) throw tooLarge(maxBytes);
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw tooLarge(maxBytes);
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

export interface ThrottleDeps {
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Espace les requêtes d'au moins `minIntervalMs`. Chaque appel réserve son créneau tout de suite,
 * donc même des appels simultanés partent les uns après les autres.
 */
export function createThrottle(minIntervalMs: number, deps: ThrottleDeps = {}): () => Promise<void> {
  const now = deps.now ?? Date.now;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  let nextSlot = 0;

  return async () => {
    const current = now();
    const slot = Math.max(current, nextSlot);
    nextSlot = slot + minIntervalMs;
    if (slot > current) await sleep(slot - current);
  };
}

/** Transforme une réponse HTTP en erreur lisible quand elle n'est pas un succès. */
export function errorForStatus(status: number, accession: string, source: string): RemoteFetchError {
  if (status === 429) {
    return new RemoteFetchError('rate-limit', `${source} limite le nombre de requêtes : réessaie dans quelques secondes.`);
  }
  if (status === 400 || status === 404) {
    return new RemoteFetchError('not-found', `Aucune séquence trouvée pour « ${accession} » dans ${source}.`);
  }
  return new RemoteFetchError('server', `${source} a répondu avec une erreur (HTTP ${status}).`);
}

/** Les erreurs réseau (hors ligne, accès bloqué par CORS…) arrivent sous forme de TypeError dans fetch. */
export function networkError(source: string): RemoteFetchError {
  return new RemoteFetchError(
    'network',
    `Impossible de joindre ${source} depuis le navigateur (connexion coupée ou accès bloqué).`,
  );
}
