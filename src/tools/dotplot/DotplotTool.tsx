import { useMemo, useState } from 'react';
import { dotplotPoints } from '../../core/dotplot/kmers';
import { Dotplot2D } from '../../viz/Dotplot2D';

interface DotplotToolProps {
  first: string;
  second: string;
}

const MAX_K = 30;

export function DotplotTool({ first, second }: DotplotToolProps) {
  const [k, setK] = useState(2);
  const maxK = Math.max(1, Math.min(MAX_K, first.length, second.length));
  const effectiveK = Math.min(k, maxK);

  const result = useMemo(
    () => (first && second ? dotplotPoints(first, second, effectiveK) : undefined),
    [first, second, effectiveK],
  );

  if (!first || !second || !result) return <p>Entrez deux séquences.</p>;

  const density = (result.total / Math.max(1, (first.length - effectiveK + 1) * (second.length - effectiveK + 1))) * 100;

  return (
    <div>
      <label>
        Longueur des k-mers (k = {effectiveK})
        <input type="range" min={1} max={maxK} value={effectiveK} onChange={(event) => setK(Number(event.target.value))} />
      </label>
      <p>
        {result.total.toLocaleString('fr-FR')} k-mers communs ({density.toFixed(1)} % des cases). Les diagonales
        indiquent des régions similaires ; augmente k pour réduire le bruit.
      </p>
      {result.truncated && (
        <p role="alert">
          Trop de points : seuls les {result.count.toLocaleString('fr-FR')} premiers sont affichés. Augmente k.
        </p>
      )}
      <Dotplot2D points={result.points} k={effectiveK} firstSequence={first} secondSequence={second} />
    </div>
  );
}
