import { describe, expect, it, vi } from 'vitest';
import { buildEfetchUrl, fetchNcbiSequence, guessNcbiDb, validateNcbiAccession } from '../../src/data/ncbi';

const noWait = async () => {};
const fasta = (header: string, sequence: string) => new Response(`>${header}\n${sequence.match(/.{1,10}/g)!.join('\n')}\n`);
const urlOf = (call: unknown[]) => new URL(call[0] as string);

describe('validateNcbiAccession', () => {
  it('accepte les formats courants', () => {
    for (const ok of ['NM_000518.5', 'NP_000509.1', 'P69905', 'AB123456.1', ' NC_000001.11 ', '123456']) {
      expect(() => validateNcbiAccession(ok)).not.toThrow();
    }
  });

  it('refuse ce qui pourrait injecter des paramètres dans l\'URL', () => {
    for (const bad of ['', 'NM_000518&db=pubmed', 'a b', '../etc/passwd', 'NM_1;rm', 'id=1,2,3', 'x'.repeat(40)]) {
      expect(() => validateNcbiAccession(bad)).toThrowError(/accession/);
    }
  });
});

describe('guessNcbiDb', () => {
  it('devine nucléotide / protéine d\'après le préfixe, et laisse les cas ambigus', () => {
    expect(guessNcbiDb('NM_000518.5')).toBe('nuccore');
    expect(guessNcbiDb('NC_000001.11')).toBe('nuccore');
    expect(guessNcbiDb('NP_000509.1')).toBe('protein');
    expect(guessNcbiDb('AAA12345.1')).toBe('protein');
    expect(guessNcbiDb('P69905')).toBeUndefined();
  });
});

describe('buildEfetchUrl', () => {
  it('construit la bonne requête', () => {
    const url = new URL(buildEfetchUrl('NM_000518.5', 'nuccore', { email: 'a@b.fr', range: { start: 10, end: 50 } }));
    expect(url.origin + url.pathname).toBe('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      db: 'nuccore', id: 'NM_000518.5', rettype: 'fasta', retmode: 'text', tool: 'TriaLign',
      email: 'a@b.fr', seq_start: '10', seq_stop: '50',
    });
  });

  it('n\'envoie pas de plage pour les protéines et ajoute la clé d\'API si fournie', () => {
    const url = new URL(buildEfetchUrl('NP_000509.1', 'protein', { apiKey: 'K', range: { start: 1, end: 5 } }));
    expect(url.searchParams.has('seq_start')).toBe(false);
    expect(url.searchParams.get('api_key')).toBe('K');
  });
});

describe('fetchNcbiSequence', () => {
  it('récupère une séquence nucléotidique (base devinée)', async () => {
    const fetcher = vi.fn(async () => fasta('NM_000518.5 Homo sapiens hemoglobin subunit beta (HBB), mRNA', 'ACATTTGCTTCTGACACAAC'));
    const record = await fetchNcbiSequence('NM_000518.5', { fetcher, throttle: noWait });
    expect(record.value).toBe('ACATTTGCTTCTGACACAAC');
    expect(record.label).toContain('HBB');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(urlOf(fetcher.mock.calls[0]).searchParams.get('db')).toBe('nuccore');
  });

  it('en mode auto, essaie les protéines si le numéro n\'existe pas en nucléotides', async () => {
    const fetcher = vi.fn(async (url: string) =>
      new URL(url).searchParams.get('db') === 'nuccore'
        ? new Response('Error: no such record\n')
        : fasta('sp|P69905|HBA_HUMAN Hemoglobin subunit alpha', 'MVLSPADKTNVKAAWGKVGA'),
    );
    const record = await fetchNcbiSequence('P69905', { fetcher, throttle: noWait });
    expect(record.value).toBe('MVLSPADKTNVKAAWGKVGA');
    expect(fetcher.mock.calls.map((call) => urlOf(call).searchParams.get('db'))).toEqual(['nuccore', 'protein']);
  });

  it('respecte la base demandée sans essayer l\'autre', async () => {
    const fetcher = vi.fn(async () => new Response(''));
    await expect(fetchNcbiSequence('P69905', { db: 'protein', fetcher, throttle: noWait })).rejects.toMatchObject({ kind: 'not-found' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('signale un numéro introuvable (réponse 200 sans FASTA)', async () => {
    const fetcher = async () => new Response('<ERROR>Cannot get data</ERROR>');
    await expect(fetchNcbiSequence('NM_999999999', { fetcher, throttle: noWait })).rejects.toMatchObject({ kind: 'not-found' });
  });

  it('signale la limite de requêtes (429)', async () => {
    const fetcher = async () => new Response('Too many', { status: 429 });
    await expect(fetchNcbiSequence('NM_000518.5', { fetcher, throttle: noWait })).rejects.toMatchObject({ kind: 'rate-limit' });
  });

  it('signale une panne réseau ou un blocage CORS', async () => {
    const fetcher = async () => { throw new TypeError('Failed to fetch'); };
    await expect(fetchNcbiSequence('NM_000518.5', { fetcher, throttle: noWait })).rejects.toMatchObject({ kind: 'network' });
  });

  it('refuse une séquence trop volumineuse', async () => {
    const fetcher = async () => new Response('>chr1\n' + 'A'.repeat(5000));
    await expect(fetchNcbiSequence('NC_000001.11', { fetcher, throttle: noWait, maxBytes: 1000 })).rejects.toMatchObject({ kind: 'too-large' });
  });

  it('ne fait aucune requête pour un numéro invalide', async () => {
    const fetcher = vi.fn();
    await expect(fetchNcbiSequence('NM_000518&db=pubmed', { fetcher, throttle: noWait })).rejects.toMatchObject({ kind: 'invalid-id' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('transmet le signal d\'annulation', async () => {
    const controller = new AbortController();
    const fetcher = vi.fn(async () => fasta('x', 'ACGT'));
    await fetchNcbiSequence('NM_000518.5', { fetcher, throttle: noWait, signal: controller.signal });
    expect((fetcher.mock.calls[0] as unknown[])[1]).toMatchObject({ signal: controller.signal });
  });
});
