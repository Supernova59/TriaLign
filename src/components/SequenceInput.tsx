interface SequenceInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function SequenceInput({ value, onChange }: SequenceInputProps) {
  return (
    <label>
      Séquence FASTA ou brute
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={8} />
    </label>
  );
}
