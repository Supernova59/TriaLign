import type { Sequence } from '../core/types';

export function parseFasta(input: string): Sequence[] {
  const entries: Sequence[] = [];
  let current: Sequence | undefined;

  for (const line of input.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('>')) {
      if (current) entries.push(current);
      const label = trimmed.slice(1).trim() || `sequence-${entries.length + 1}`;
      current = { id: label, label, value: '' };
    } else if (current) {
      current.value += trimmed.replace(/\s+/g, '').toUpperCase();
    }
  }

  if (current) entries.push(current);
  return entries;
}

export function normalizeSequenceInput(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith('>')) {
    return parseFasta(trimmed)[0]?.value ?? '';
  }

  return trimmed.replace(/\s+/g, '').toUpperCase();
}

/** Écrit une séquence au format FASTA, avec des lignes de 70 lettres. */
export function formatFasta(sequence: Sequence, lineWidth = 70): string {
  const lines: string[] = [`>${sequence.label}`];
  for (let start = 0; start < sequence.value.length; start += lineWidth) {
    lines.push(sequence.value.slice(start, start + lineWidth));
  }
  return lines.join('\n');
}
