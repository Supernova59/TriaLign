import { useMemo, useState } from 'react';
import { globalAlignment } from './core/alignment/pairwise';
import { normalizeSequenceInput } from './data/fasta';
import { AlignmentText } from './viz/AlignmentText';
import { SequenceInput } from './components/SequenceInput';

export function App() {
  const [firstInput, setFirstInput] = useState('ACGT');
  const [secondInput, setSecondInput] = useState('AGT');
  const firstSequence = useMemo(() => normalizeSequenceInput(firstInput), [firstInput]);
  const secondSequence = useMemo(() => normalizeSequenceInput(secondInput), [secondInput]);
  const alignment =
    firstSequence && secondSequence ? globalAlignment(firstSequence, secondSequence) : undefined;

  return (
    <main>
      <header>
        <p>Tripath</p>
        <h1>Comparer des séquences biologiques</h1>
        <p>Un espace pédagogique pour comprendre les alignements 2D et 3D.</p>
      </header>
      <section>
        <div className="sequence-inputs">
          <SequenceInput label="Séquence 1" value={firstInput} onChange={setFirstInput} />
          <SequenceInput label="Séquence 2" value={secondInput} onChange={setSecondInput} />
        </div>
        {alignment ? <AlignmentText alignment={alignment} /> : <p>Entrez deux séquences.</p>}
      </section>
    </main>
  );
}
