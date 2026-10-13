import { useEffect, useRef, useState } from 'react';
import { formatFasta } from '../data/fasta';
import { fetchNcbiSequence, type NcbiDb } from '../data/ncbi';
import { fetchUniprotSequence } from '../data/uniprot';

type Source = 'ncbi-auto' | 'ncbi-nuccore' | 'ncbi-protein' | 'uniprot';

const SOURCES: Array<{ value: Source; label: string }> = [
  { value: 'ncbi-auto', label: 'NCBI (auto)' },
  { value: 'ncbi-nuccore', label: 'NCBI nucléotide' },
  { value: 'ncbi-protein', label: 'NCBI protéine' },
  { value: 'uniprot', label: 'UniProt' },
];

interface AccessionLoaderProps {
  label: string;
  /** Appelé avec le texte FASTA de la séquence téléchargée. */
  onLoaded: (fasta: string) => void;
}

export function AccessionLoader({ label, onLoaded }: AccessionLoaderProps) {
  const [accession, setAccession] = useState('');
  const [source, setSource] = useState<Source>('ncbi-auto');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  async function load() {
    if (!accession.trim()) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus('loading');
    setMessage('');

    try {
      const record =
        source === 'uniprot'
          ? await fetchUniprotSequence(accession, { signal: controller.signal })
          : await fetchNcbiSequence(accession, {
              db: source.replace('ncbi-', '') as NcbiDb,
              signal: controller.signal,
            });
      onLoaded(formatFasta(record));
      setStatus('done');
      setMessage(`Chargé : ${record.label.slice(0, 80)} (${record.value.length.toLocaleString('fr-FR')} lettres)`);
    } catch (error) {
      if (controller.signal.aborted) return;
      setStatus('error');
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className="accession-loader">
      <input
        type="text"
        value={accession}
        placeholder="N° d'accession (ex. NM_000518.5)"
        aria-label={`Numéro d'accession pour ${label}`}
        onChange={(event) => setAccession(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && void load()}
      />
      <select value={source} aria-label={`Base de données pour ${label}`} onChange={(event) => setSource(event.target.value as Source)}>
        {SOURCES.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>
      <button type="button" onClick={() => void load()} disabled={status === 'loading' || !accession.trim()}>
        {status === 'loading' ? 'Chargement…' : 'Charger'}
      </button>
      {message && <p role={status === 'error' ? 'alert' : 'status'} className="accession-message">{message}</p>}
    </div>
  );
}
