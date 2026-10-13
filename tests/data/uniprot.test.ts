import { describe, expect, it, vi } from 'vitest';
import { buildUniprotUrl, fetchUniprotSequence, validateUniprotAccession } from '../../src/data/uniprot';
import { formatFasta, parseFasta } from '../../src/data/fasta';

describe('validateUniprotAccession', () => {
  it('accepte les numéros valides, en majuscules ou non', () => {
    expect(validateUniprotAccession('P69905')).toBe('P69905');
    expect(validateUniprotAccession(' p69905 ')).toBe('P69905');
    expect(validateUniprotAccession('A0A024R161')).toBe('A0A024R161');
    expect(validateUniprotAccession('Q8N158')).toBe('Q8N158');
  });

  it('refuse les autres formats', () => {
    for (const bad of ['', 'NM_000518.5', 'P6990', 'P69905/../x', '12345', 'P69905?format=json']) {
      expect(() => validateUniprotAccession(bad)).toThrowError(/UniProt/);
    }
  });
});

describe('fetchUniprotSequence', () => {
  it('construit l\'URL REST et lit le FASTA', async () => {
    const fetcher = vi.fn(async () => new Response('>sp|P69905|HBA_HUMAN Hemoglobin subunit alpha OS=Homo sapiens\nMVLSPADKTN\nVKAAWGKVGA\n'));
    const record = await fetchUniprotSequence('P69905', { fetcher });
    expect(fetcher.mock.calls[0][0]).toBe('https://rest.uniprot.org/uniprotkb/P69905.fasta');
    expect(buildUniprotUrl('P69905')).toBe('https://rest.uniprot.org/uniprotkb/P69905.fasta');
    expect(record.value).toBe('MVLSPADKTNVKAAWGKVGA');
  });

  it('signale un numéro inconnu (404), une panne réseau et une réponse vide', async () => {
    await expect(fetchUniprotSequence('P00000', { fetcher: async () => new Response('', { status: 404 }) })).rejects.toMatchObject({ kind: 'not-found' });
    await expect(fetchUniprotSequence('P69905', { fetcher: async () => { throw new TypeError('x'); } })).rejects.toMatchObject({ kind: 'network' });
    await expect(fetchUniprotSequence('P69905', { fetcher: async () => new Response('') })).rejects.toMatchObject({ kind: 'not-found' });
  });
});

describe('formatFasta', () => {
  it('découpe en lignes de 70 lettres et se relit à l\'identique', () => {
    const sequence = { id: 'x test', label: 'x test', value: 'ACGT'.repeat(40) };
    const text = formatFasta(sequence);
    expect(text.split('\n').slice(1).every((line) => line.length <= 70)).toBe(true);
    expect(parseFasta(text)[0]).toEqual(sequence);
  });
});
