import { useMemo, useState } from 'react';
import { globalAlignment } from './core/alignment/pairwise';
import { parseFasta } from './data/fasta';
import { AlignmentText } from './viz/AlignmentText';
import { SequenceInput } from './components/SequenceInput';

const initialInput = '>sequence-1\nACGT\n>sequence-2\nAGT';

export function App() {
  const [input, setInput] = useState(initialInput);
  const sequences = useMemo(() => parseFasta(input), [input]);
  const alignment =
    sequences.length >= 2 ? globalAlignment(sequences[0].value, sequences[1].value) : undefined;

  return (
    <main>
      <header>
        <p>Tripath</p>
        <h1>Comparer des séquences biologiques</h1>
        <p>Un espace pédagogique pour comprendre les alignements 2D et 3D.</p>
      </header>
      <section>
        <SequenceInput value={input} onChange={setInput} />
        {alignment ? <AlignmentText alignment={alignment} /> : <p>Entrez au moins deux séquences FASTA.</p>}
      </section>
    </main>
  );
}
