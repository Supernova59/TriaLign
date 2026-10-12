import { useEffect, useMemo, useRef, useState } from 'react';
import { checkPairwiseSize, checkTripleSize } from './core/alignment/limits';
import { normalizeSequenceInput } from './data/fasta';
import { AlignmentText } from './viz/AlignmentText';
import { SequenceInput } from './components/SequenceInput';
import { AlignmentCancelledError, startAlignment, type AlignmentJob } from './workers/alignmentClient';
import type { AlignmentMethod, AlignmentResult } from './workers/messages';

type Status = 'idle' | 'running' | 'done' | 'error';

export function App() {
  const [firstInput, setFirstInput] = useState('ACGT');
  const [secondInput, setSecondInput] = useState('AGT');
  const [thirdInput, setThirdInput] = useState('ACT');
  const [method, setMethod] = useState<AlignmentMethod>('global');
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AlignmentResult | undefined>();
  const [errorMessage, setErrorMessage] = useState('');
  const jobRef = useRef<AlignmentJob | null>(null);

  const firstSequence = useMemo(() => normalizeSequenceInput(firstInput), [firstInput]);
  const secondSequence = useMemo(() => normalizeSequenceInput(secondInput), [secondInput]);
  const thirdSequence = useMemo(() => normalizeSequenceInput(thirdInput), [thirdInput]);

  const isTriple = method === 'triple';
  const ready = Boolean(firstSequence && secondSequence && (!isTriple || thirdSequence));
  const size = isTriple
    ? checkTripleSize(firstSequence.length, secondSequence.length, thirdSequence.length)
    : checkPairwiseSize(firstSequence.length, secondSequence.length);

  // Si les séquences ou la méthode changent, le résultat affiché n'est plus valable.
  useEffect(() => {
    jobRef.current?.cancel();
    jobRef.current = null;
    setStatus('idle');
    setResult(undefined);
    setProgress(0);
    setErrorMessage('');
  }, [firstSequence, secondSequence, thirdSequence, method]);

  // Arrête un éventuel calcul si on quitte la page.
  useEffect(() => () => jobRef.current?.cancel(), []);

  function compute() {
    if (!ready || !size.ok) return;
    setStatus('running');
    setProgress(0);
    setResult(undefined);
    setErrorMessage('');

    const job = startAlignment(
      { method, sequences: isTriple ? [firstSequence, secondSequence, thirdSequence] : [firstSequence, secondSequence] },
      setProgress,
    );
    jobRef.current = job;

    job.promise
      .then((value) => {
        if (jobRef.current !== job) return;
        setResult(value);
        setStatus('done');
      })
      .catch((error: unknown) => {
        if (error instanceof AlignmentCancelledError) return;
        setErrorMessage(error instanceof Error ? error.message : String(error));
        setStatus('error');
      });
  }

  function cancel() {
    jobRef.current?.cancel();
    jobRef.current = null;
    setStatus('idle');
    setProgress(0);
  }

  return (
    <main>
      <header>
        <p>Tripath</p>
        <h1>Comparer des séquences biologiques</h1>
        <p>Un espace pédagogique pour comprendre les alignements 2D et 3D.</p>
      </header>
      <section>
        <label>
          Méthode d’alignement
          <select value={method} onChange={(event) => setMethod(event.target.value as AlignmentMethod)}>
            <option value="global">Global (Needleman-Wunsch)</option>
            <option value="local">Local (Smith-Waterman)</option>
            <option value="semi-global">Semi-global</option>
            <option value="triple">Global à trois séquences</option>
          </select>
        </label>
        <div className="sequence-inputs">
          <SequenceInput label="Séquence 1" value={firstInput} onChange={setFirstInput} />
          <SequenceInput label="Séquence 2" value={secondInput} onChange={setSecondInput} />
          {isTriple && <SequenceInput label="Séquence 3" value={thirdInput} onChange={setThirdInput} />}
        </div>

        {ready && !size.ok && <p role="alert">{size.message}</p>}
        {ready && size.ok && isTriple && (
          <p>Cube de calcul : {size.cells.toLocaleString('fr-FR')} cases (maximum {size.maxCells.toLocaleString('fr-FR')}).</p>
        )}

        <p>
          {status === 'running' ? (
            <button type="button" onClick={cancel}>Annuler</button>
          ) : (
            <button type="button" onClick={compute} disabled={!ready || !size.ok}>Calculer</button>
          )}
        </p>

        {status === 'running' && (
          <p>
            <progress value={progress} max={1} /> {Math.round(progress * 100)} %
          </p>
        )}
        {status === 'error' && <p role="alert">{errorMessage}</p>}
        {status === 'idle' && !result && (
          <p>{ready ? 'Clique sur « Calculer » pour lancer l’alignement.' : isTriple ? 'Entrez trois séquences.' : 'Entrez deux séquences.'}</p>
        )}

        {result?.kind === 'pairwise' && <AlignmentText alignment={result.alignment} />}
        {result?.kind === 'triple' && (
          <div>
            <pre aria-label="Alignement de trois séquences">{result.alignment.sequences.join('\n')}</pre>
            <p>Score : {result.alignment.score}</p>
          </div>
        )}
      </section>
    </main>
  );
}
