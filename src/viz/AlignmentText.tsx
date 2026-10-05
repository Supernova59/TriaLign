import type { PairwiseAlignment } from '../core/types';
import { defaultScoring } from '../core/alignment/scoring';

export function AlignmentText({ alignment }: { alignment: PairwiseAlignment }) {
  const matches = [...alignment.first].filter(
    (character, index) => character === alignment.second[index] && character !== '-',
  ).length;
  const gaps = [...alignment.first].filter(
    (character, index) => character === '-' || alignment.second[index] === '-',
  ).length;
  const mismatches = alignment.first.length - matches - gaps;

  return (
    <div>
      <pre aria-label="Alignement">
        {alignment.first}
        {'\n'}
        {alignment.second}
      </pre>
      <p>
        Score : {alignment.score} ({matches} match(s) × {defaultScoring.match},{' '}
        {mismatches} mismatch(s) × {defaultScoring.mismatch},{' '}
        {gaps} gap(s) × {defaultScoring.gap})
      </p>
    </div>
  );
}
