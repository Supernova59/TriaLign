import { useMemo, useState } from 'react';
import { comparePairs } from '../../core/dotplot/segments';
import { Ribbons } from '../../viz/Ribbons';

export interface DotpathItem {
  label: string;
  sequence: string;
}

interface DotpathToolProps {
  items: DotpathItem[];
}

const pct = (value: number) => `${Math.round(value * 100)} %`;

export function DotpathTool({ items }: DotpathToolProps) {
  const [k, setK] = useState(6);
  const [minLength, setMinLength] = useState(12);
  const [minIdentityPct, setMinIdentityPct] = useState(80);
  const [maxGap, setMaxGap] = useState(2);
  const [hiddenPairs, setHiddenPairs] = useState<Set<string>>(new Set());

  const sequences = items.map((item) => item.sequence);
  const labels = items.map((item) => item.label);
  const shortest = Math.min(...sequences.map((sequence) => sequence.length));
  const maxK = Math.max(1, Math.min(20, shortest));
  const effectiveK = Math.min(k, maxK);
  const effectiveMinLength = Math.max(minLength, effectiveK);

  const comparisons = useMemo(
    () =>
      sequences.length >= 2 && shortest > 0
        ? comparePairs(sequences, { k: effectiveK, maxGap, minLength: effectiveMinLength, minIdentity: minIdentityPct / 100 })
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sequences.join('|'), effectiveK, maxGap, effectiveMinLength, minIdentityPct],
  );

  if (sequences.length < 2 || shortest === 0) return <p>Entrez au moins deux séquences.</p>;

  const pairKey = (a: number, b: number) => `${a}-${b}`;
  const visible = comparisons.filter((pair) => !hiddenPairs.has(pairKey(pair.a, pair.b)));
  const truncated = comparisons.some((pair) => pair.truncated);

  function togglePair(key: string) {
    setHiddenPairs((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Part de la séquence « ligne » couverte par des segments communs avec la séquence « colonne ».
  const cell = (row: number, column: number) => {
    const pair = comparisons.find((item) => item.a === Math.min(row, column) && item.b === Math.max(row, column));
    if (!pair) return null;
    return { coverage: row < column ? pair.summary.coverageA : pair.summary.coverageB, identity: pair.summary.meanIdentity, count: pair.summary.segmentCount };
  };

  return (
    <div className="dotpath">
      <div className="dotpath-controls">
        <label>
          Longueur des k-mers de départ (k = {effectiveK})
          <input type="range" min={3} max={Math.max(3, maxK)} value={effectiveK} onChange={(event) => setK(Number(event.target.value))} />
        </label>
        <label>
          Longueur minimale d'un segment ({effectiveMinLength} lettres)
          <input type="range" min={effectiveK} max={100} value={effectiveMinLength} onChange={(event) => setMinLength(Number(event.target.value))} />
        </label>
        <label>
          Identité minimale ({minIdentityPct} %)
          <input type="range" min={50} max={100} value={minIdentityPct} onChange={(event) => setMinIdentityPct(Number(event.target.value))} />
        </label>
        <label>
          Différences tolérées dans un segment (jusqu'à {maxGap} lettres de suite)
          <input type="range" min={0} max={5} value={maxGap} onChange={(event) => setMaxGap(Number(event.target.value))} />
        </label>
      </div>

      {sequences.length > 2 && (
        <fieldset className="dotpath-pairs">
          <legend>Paires affichées</legend>
          {comparisons.map((pair) => (
            <label key={pairKey(pair.a, pair.b)}>
              <input type="checkbox" checked={!hiddenPairs.has(pairKey(pair.a, pair.b))} onChange={() => togglePair(pairKey(pair.a, pair.b))} />
              {labels[pair.a]} ↔ {labels[pair.b]}
            </label>
          ))}
        </fieldset>
      )}

      {truncated && <p role="alert">Trop de k-mers communs : le résultat est partiel. Augmente k.</p>}

      <Ribbons labels={labels} lengths={sequences.map((sequence) => sequence.length)} pairs={visible} />

      <table className="dotpath-matrix">
        <caption>Part de la séquence (ligne) couverte par des segments similaires avec la séquence (colonne)</caption>
        <thead>
          <tr>
            <th scope="col" />
            {labels.map((label) => (
              <th key={label} scope="col">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((rowLabel, row) => (
            <tr key={rowLabel}>
              <th scope="row">{rowLabel}</th>
              {labels.map((columnLabel, column) => {
                const data = row === column ? null : cell(row, column);
                return (
                  <td key={columnLabel}>
                    {row === column ? '—' : data ? (
                      <>
                        <strong>{pct(data.coverage)}</strong>
                        <small>{data.count ? `identité ${pct(data.identity)} · ${data.count} segment${data.count > 1 ? 's' : ''}` : 'aucun segment'}</small>
                      </>
                    ) : '—'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="dotplot-legend" aria-label="Légende du dotpath">
        <li><strong>▭</strong> Une barre = une séquence (même échelle pour toutes)</li>
        <li><strong>◢</strong> Un ruban relie deux régions similaires ; sa couleur indique l'identité, sa largeur la longueur</li>
        <li><strong>✕</strong> Des rubans qui se croisent = des régions présentes dans un ordre différent</li>
        <li>Ne détecte que les similarités dans le même sens et sans insertion à l'intérieur d'un segment. Survole un ruban pour lire les positions.</li>
      </ul>
    </div>
  );
}
