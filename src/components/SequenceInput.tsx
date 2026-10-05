interface SequenceInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function SequenceInput({ label, value, onChange }: SequenceInputProps) {
  return (
    <label>
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={8} />
    </label>
  );
}
