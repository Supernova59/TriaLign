import { useMemo, useState } from 'react';
import {
  globalAlignment,
  localAlignment,
  semiGlobalAlignment,
} from './core/alignment/pairwise';
import { normalizeSequenceInput } from './data/fasta';
import { AlignmentText } from './viz/AlignmentText';
import { SequenceInput } from './components/SequenceInput';

type AlignmentMethod = 'global' | 'local' | 'semi-global';

export function App() {
  const [firstInput, setFirstInput] = useState('ACGT');
  const [secondInput, setSecondInput] = useState('AGT');
  const [method, setMethod] = useState<AlignmentMethod>('global');
  const firstSequence = useMemo(() => normalizeSequenceInput(firstInput), [firstInput]);
  const secondSequence = useMemo(() => normalizeSequenceInput(secondInput), [secondInput]);
  const alignment = useMemo(() => {
    if (!firstSequence || !secondSequence) return undefined;
    if (method === 'local') return localAlignment(firstSequence, secondSequence);
    if (method === 'semi-global') return semiGlobalAlignment(firstSequence, secondSequence);
    return globalAlignment(firstSequence, secondSequence);
  }, [firstSequence, secondSequence, method]);

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
          </select>
        </label>
        <div className="sequence-inputs">
          <SequenceInput label="Séquence 1" value={firstInput} onChange={setFirstInput} />
          <SequenceInput label="Séquence 2" value={secondInput} onChange={setSecondInput} />
        </div>
        {alignment ? <AlignmentText alignment={alignment} /> : <p>Entrez deux séquences.</p>}
      </section>
    </main>
  );
}
