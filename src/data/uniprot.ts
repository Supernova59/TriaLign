import type { Sequence } from '../core/types';
import { parseFasta } from './fasta';
import {
  DEFAULT_MAX_BYTES,
  RemoteFetchError,
  defaultFetcher,
  errorForStatus,
  networkError,
  readTextLimited,
  type Fetcher,
} from './remote';

export interface UniprotOptions {
  maxBytes?: number;
  signal?: AbortSignal;
  fetcher?: Fetcher;
}

export const UNIPROT_BASE_URL = 'https://rest.uniprot.org/uniprotkb';

// Format officiel des numéros d'accession UniProtKB (par exemple P69905 ou A0A024R161).
const UNIPROT_ACCESSION = /^([OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2})$/;

export function validateUniprotAccession(raw: string): string {
  const accession = raw.trim().toUpperCase();
  if (!UNIPROT_ACCESSION.test(accession)) {
    throw new RemoteFetchError('invalid-id', `« ${raw.trim()} » n'est pas un numéro d'accession UniProt valide (exemple : P69905).`);
  }
  return accession;
}

export function buildUniprotUrl(accession: string): string {
  return `${UNIPROT_BASE_URL}/${accession}.fasta`;
}

export async function fetchUniprotSequence(rawAccession: string, options: UniprotOptions = {}): Promise<Sequence> {
  const accession = validateUniprotAccession(rawAccession);
  const fetcher = options.fetcher ?? defaultFetcher;

  let response: Response;
  try {
    response = await fetcher(buildUniprotUrl(accession), { signal: options.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw networkError('UniProt');
  }

  if (!response.ok) throw errorForStatus(response.status, accession, 'UniProt');

  const record = parseFasta(await readTextLimited(response, options.maxBytes ?? DEFAULT_MAX_BYTES))[0];
  if (!record || !record.value) {
    throw new RemoteFetchError('not-found', `Aucune séquence trouvée pour « ${accession} » dans UniProt.`);
  }
  return record;
}
