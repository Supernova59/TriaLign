import { useEffect, useRef, useState } from 'react';
import { MARGIN, SIZE, canvasToCell, cellCenter, layout, niceStep } from './dotplotGeometry';

interface Dotplot2DProps {
  /** Paires aplaties [i0, j0, i1, j1, ...] (positions à partir de 0). */
  points: Uint32Array;
  k: number;
  firstSequence: string;
  secondSequence: string;
}

const COLORS = { dot: '#1f3a5f', grid: '#e3e8ef', axis: '#6b7686', frame: '#c5ccd8' };

export function Dotplot2D({ points, k, firstSequence, secondSequence }: Dotplot2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<{ i: number; j: number } | null>(null);
  const n = firstSequence.length;
  const m = secondSequence.length;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = SIZE * ratio;
    canvas.height = SIZE * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, SIZE, SIZE);

    const l = layout(n, m);
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = COLORS.axis;
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;

    // Graduations et grille : séquence 1 en horizontal, séquence 2 en vertical (origine en bas à gauche).
    ctx.textAlign = 'center';
    for (let value = 0; value <= n; value += niceStep(n)) {
      const x = l.xAt(value);
      ctx.beginPath();
      ctx.moveTo(x, MARGIN.top);
      ctx.lineTo(x, MARGIN.top + l.plotHeight);
      ctx.stroke();
      ctx.fillText(String(value), x, MARGIN.top + l.plotHeight + 14);
    }
    ctx.textAlign = 'right';
    for (let value = 0; value <= m; value += niceStep(m)) {
      const y = l.yAt(value);
      ctx.beginPath();
      ctx.moveTo(MARGIN.left, y);
      ctx.lineTo(MARGIN.left + l.plotWidth, y);
      ctx.stroke();
      ctx.fillText(String(value), MARGIN.left - 6, y + 4);
    }
    ctx.textAlign = 'center';
    ctx.fillText('Séquence 1 →', MARGIN.left + l.plotWidth / 2, SIZE - 8);
    ctx.save();
    ctx.translate(12, MARGIN.top + l.plotHeight / 2);
    ctx.rotate(-Math.PI / 2); // le texte se lit de bas en haut : la flèche pointe vers le haut
    ctx.fillText('Séquence 2 →', 0, 0);
    ctx.restore();

    ctx.strokeStyle = COLORS.frame;
    ctx.strokeRect(MARGIN.left, MARGIN.top, l.plotWidth, l.plotHeight);

    // Points : un k-mer commun est tracé comme un petit segment diagonal.
    const count = points.length / 2;
    if (count <= 200_000) {
      ctx.strokeStyle = COLORS.dot;
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let p = 0; p < count; p += 1) {
        const i = points[p * 2];
        const j = points[p * 2 + 1];
        const start = cellCenter(l, i, j);
        const end = cellCenter(l, i + k - 1, j + k - 1);
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
      }
      ctx.stroke();
    } else {
      // Trop de points pour des segments : on dessine de simples pixels.
      ctx.fillStyle = COLORS.dot;
      for (let p = 0; p < count; p += 1) {
        const i = points[p * 2];
        const j = points[p * 2 + 1];
        ctx.fillRect(l.xAt(i), l.yAt(j + 1), Math.max(1, l.scaleX), Math.max(1, l.scaleY));
      }
    }
  }, [points, k, n, m]);

  function onMouseMove(event: React.MouseEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    // On repasse des pixels de l'écran aux coordonnées logiques du canvas.
    const px = ((event.clientX - rect.left) / rect.width) * SIZE;
    const py = ((event.clientY - rect.top) / rect.height) * SIZE;
    setHover(canvasToCell(layout(n, m), px, py, n, m));
  }

  return (
    <div className="dotplot">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Dotplot : ${points.length / 2} k-mers communs de longueur ${k}`}
        style={{ width: '100%', maxWidth: SIZE, aspectRatio: '1' }}
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHover(null)}
      />
      <p className="dotplot-hover">
        {hover
          ? `Séquence 1 : position ${hover.i + 1} (${firstSequence[hover.i]}) · Séquence 2 : position ${hover.j + 1} (${secondSequence[hover.j]})`
          : 'Survole le graphique pour lire les positions.'}
      </p>

      <ul className="dotplot-legend" aria-label="Légende du dotplot">
        <li>
          <svg width="22" height="16" aria-hidden="true">
            <line x1="3" y1="13" x2="19" y2="3" stroke={COLORS.dot} strokeWidth="2" strokeLinecap="round" />
          </svg>
          Un trait = un k-mer commun aux deux séquences ({k} lettre{k > 1 ? 's' : ''} identiques à la suite)
        </li>
        <li><strong>↗</strong> Une diagonale = une région similaire, dans le même sens</li>
        <li><strong>║</strong> Plusieurs diagonales parallèles = un motif qui se répète</li>
        <li><strong>·</strong> Des points isolés = coïncidences dues au hasard (augmente k pour les faire disparaître)</li>
        <li>Axes : positions en lettres, l'origine est en bas à gauche</li>
      </ul>
    </div>
  );
}
