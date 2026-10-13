import type { PairComparison } from '../core/dotplot/segments';
import { BAR_HEIGHT, COLOR_SCALE_MIN, MARGIN, identityColor, ribbonLayout, ribbonPath } from './ribbonGeometry';

interface RibbonsProps {
  labels: string[];
  lengths: number[];
  /** Les paires à dessiner (indices dans labels / lengths, a < b). */
  pairs: PairComparison[];
}

const BAR_COLOR = '#1f3a5f';

export function Ribbons({ labels, lengths, pairs }: RibbonsProps) {
  const layout = ribbonLayout(lengths);
  // On dessine d'abord les paires non voisines (1-3), plus discrètes, puis les voisines.
  const ordered = [...pairs].sort((x, y) => (y.b - y.a) - (x.b - x.a));
  const total = pairs.reduce((sum, pair) => sum + pair.segments.length, 0);

  return (
    <svg
      className="ribbons"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="img"
      aria-label={`Carte de similarité : ${total} segment${total > 1 ? 's' : ''} entre ${lengths.length} séquences`}
    >
      {ordered.map((pair) => (
        <g key={`${pair.a}-${pair.b}`} opacity={pair.b - pair.a > 1 ? 0.55 : 1}>
          {pair.segments.map((segment) => {
            const color = identityColor(segment.identity);
            return (
              <path
                key={`${segment.aStart}-${segment.bStart}`}
                className="ribbon"
                d={ribbonPath(layout, pair.a, pair.b, segment)}
                fill={color}
                fillOpacity={0.6}
                stroke={color}
                strokeWidth={0.6}
              >
                <title>
                  {`${labels[pair.a]} ${segment.aStart + 1}–${segment.aEnd + 1} ↔ ${labels[pair.b]} ${segment.bStart + 1}–${segment.bEnd + 1} · ${Math.round(segment.identity * 100)} % d'identité · ${segment.length} lettres`}
                </title>
              </path>
            );
          })}
        </g>
      ))}

      {layout.bars.map((bar) => {
        const lengthLabel = `${bar.length.toLocaleString('fr-FR')} lettres`;
        const fitsInside = bar.width >= 110; // sinon on écrit la longueur à droite de la barre
        return (
          <g key={bar.index}>
            <rect x={bar.x} y={bar.y} width={Math.max(1, bar.width)} height={BAR_HEIGHT} rx={3} fill={BAR_COLOR} />
            <text x={bar.x - 8} y={bar.y + BAR_HEIGHT / 2 + 4} textAnchor="end" fontSize={12} fill="currentColor">
              {labels[bar.index]}
            </text>
            <text
              x={fitsInside ? bar.x + bar.width - 8 : bar.x + bar.width + 6}
              y={bar.y + BAR_HEIGHT / 2 + 4}
              textAnchor={fitsInside ? 'end' : 'start'}
              fontSize={11}
              fill={fitsInside ? '#ffffff' : '#6b7686'}
            >
              {lengthLabel}
            </text>
          </g>
        );
      })}

      <defs>
        <linearGradient id="identity-scale" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={identityColor(COLOR_SCALE_MIN)} />
          <stop offset="100%" stopColor={identityColor(1)} />
        </linearGradient>
      </defs>
      <g transform={`translate(${layout.width - MARGIN.right - 250}, ${layout.height - 24})`} fontSize={11} fill="#6b7686">
        <text x={0} y={9}>Identité :</text>
        <text x={90} y={9} textAnchor="end">50 %</text>
        <rect x={96} y={2} width={100} height={8} fill="url(#identity-scale)" rx={2} />
        <text x={202} y={9}>100 %</text>
      </g>
    </svg>
  );
}
