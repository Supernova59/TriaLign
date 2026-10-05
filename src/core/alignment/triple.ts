export interface TripleAlignment {
  sequences: [string, string, string];
  score: number;
}

export function tripleAlignment(
  first: string,
  second: string,
  third: string,
): TripleAlignment {
  throw new Error(
    `Triple alignment is not implemented yet (${first.length} × ${second.length} × ${third.length}).`,
  );
}
