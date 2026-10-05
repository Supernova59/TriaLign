import type { PairwiseAlignment } from '../core/types';

export function AlignmentText({ alignment }: { alignment: PairwiseAlignment }) {
  return (
    <pre aria-label="Alignement">
      {alignment.first}
      {'\n'}
      {alignment.second}
      {'\n\n'}
      Score : {alignment.score}
    </pre>
  );
}
