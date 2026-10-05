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
