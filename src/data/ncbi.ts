import type { Sequence } from '../core/types';
import { parseFasta } from './fasta';
import {
  DEFAULT_MAX_BYTES,
  RemoteFetchError,
  createThrottle,
  defaultFetcher,
  errorForStatus,
  networkError,
  readTextLimited,
  type Fetcher,
} from './remote';

export type NcbiDb = 'auto' | 'nuccore' | 'protein';

export interface NcbiOptions {
  /** « auto » devine la base d'après le numéro, et essaie les deux si c'est ambigu. */
  db?: NcbiDb;
  /** Clé d'API NCBI (facultative) : fait passer la limite de 3 à 10 requêtes par seconde. */
  apiKey?: string;
  email?: string;
  /** Portion de la séquence à télécharger (positions à partir de 1, nucléotides uniquement). */
  range?: { start: number; end: number };
  maxBytes?: number;
  signal?: AbortSignal;
  fetcher?: Fetcher;
  throttle?: () => Promise<void>;
}

export const NCBI_EFETCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';

// NCBI demande au maximum 3 requêtes par seconde sans clé d'API.
const defaultThrottle = createThrottle(350);
const keyedThrottle = createThrottle(110);

export function validateNcbiAccession(raw: string): string {
  const accession = raw.trim();
  if (!/^[A-Za-z][A-Za-z0-9_]{0,28}(\.\d{1,3})?$/.test(accession) && !/^\d{1,12}$/.test(accession)) {
    throw new RemoteFetchError('invalid-id', `« ${raw.trim()} » n'est pas un numéro d'accession valide (exemple : NM_000518.5).`);
  }
  return accession;
}

/** Devine la base d'après le préfixe ; renvoie undefined quand c'est ambigu (par exemple P69905). */
export function guessNcbiDb(accession: string): 'nuccore' | 'protein' | undefined {
  if (/^(NM|NR|NC|NG|NT|NW|NZ|XM|XR)_/i.test(accession)) return 'nuccore';
  if (/^(NP|XP|YP|WP|AP)_/i.test(accession)) return 'protein';
  if (/^[A-Z]{3}\d{5,7}(\.\d+)?$/i.test(accession)) return 'protein'; // protéines GenBank (AAA12345)
  return undefined;
}

export function buildEfetchUrl(accession: string, db: 'nuccore' | 'protein', options: NcbiOptions = {}): string {
  const params = new URLSearchParams({ db, id: accession, rettype: 'fasta', retmode: 'text', tool: 'TriaLign' });
  if (options.email) params.set('email', options.email);
  if (options.apiKey) params.set('api_key', options.apiKey);
  if (options.range && db === 'nuccore') {
    params.set('seq_start', String(options.range.start));
    params.set('seq_stop', String(options.range.end));
  }
  return `${NCBI_EFETCH_URL}?${params.toString()}`;
}

async function fetchFromDb(accession: string, db: 'nuccore' | 'protein', options: NcbiOptions): Promise<Sequence> {
  const fetcher = options.fetcher ?? defaultFetcher;
  const throttle = options.throttle ?? (options.apiKey ? keyedThrottle : defaultThrottle);
  await throttle();

  let response: Response;
  try {
    response = await fetcher(buildEfetchUrl(accession, db, options), { signal: options.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw networkError('NCBI');
  }

  if (!response.ok) throw errorForStatus(response.status, accession, 'NCBI');

  const text = await readTextLimited(response, options.maxBytes ?? DEFAULT_MAX_BYTES);
  // Pour un identifiant inconnu, NCBI répond souvent « 200 » avec un message d'erreur au lieu d'une séquence FASTA.
  const record = parseFasta(text)[0];
  if (!record || !record.value) {
    throw new RemoteFetchError('not-found', `Aucune séquence trouvée pour « ${accession} » dans NCBI (${db === 'nuccore' ? 'nucléotides' : 'protéines'}).`);
  }
  return record;
}

export async function fetchNcbiSequence(rawAccession: string, options: NcbiOptions = {}): Promise<Sequence> {
  const accession = validateNcbiAccession(rawAccession);
  const requested = options.db ?? 'auto';

  if (requested !== 'auto') return fetchFromDb(accession, requested, options);

  const guessed = guessNcbiDb(accession);
  if (guessed) return fetchFromDb(accession, guessed, options);

  // Numéro ambigu : on essaie les nucléotides, puis les protéines.
  try {
    return await fetchFromDb(accession, 'nuccore', options);
  } catch (error) {
    if (error instanceof RemoteFetchError && error.kind === 'not-found') {
      return fetchFromDb(accession, 'protein', options);
    }
    throw error;
  }
}
