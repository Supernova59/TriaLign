import { useEffect, useRef, useState } from 'react';

interface Dotplot2DProps {
  /** Paires aplaties [i0, j0, i1, j1, ...] (positions à partir de 0). */
  points: Uint32Array;
  k: number;
  firstSequence: string;
  secondSequence: string;
}

const SIZE = 560; // taille logique du canvas
const MARGIN = { left: 52, top: 12, right: 12, bottom: 40 };
const COLORS = { dot: '#1f3a5f', grid: '#e3e8ef', axis: '#6b7686', frame: '#c5ccd8' };

function layout(firstLength: number, secondLength: number) {
  const plotWidth = SIZE - MARGIN.left - MARGIN.right;
  const plotHeight = SIZE - MARGIN.top - MARGIN.bottom;
  return {
    plotWidth,
    plotHeight,
    scaleX: plotWidth / Math.max(1, firstLength),
    scaleY: plotHeight / Math.max(1, secondLength),
  };
}

// Pas « rond » (1, 2, 5, 10, 20, 50...) pour avoir environ 5 graduations.
function niceStep(length: number): number {
  const raw = Math.max(1, length / 5);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const ratio = raw / magnitude;
  return (ratio < 1.5 ? 1 : ratio < 3.5 ? 2 : ratio < 7.5 ? 5 : 10) * magnitude;
}

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

    const { plotWidth, plotHeight, scaleX, scaleY } = layout(n, m);
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = COLORS.axis;
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;

    // Graduations et grille : séquence 1 en horizontal, séquence 2 en vertical.
    ctx.textAlign = 'center';
    for (let value = 0; value <= n; value += niceStep(n)) {
      const x = MARGIN.left + value * scaleX;
      ctx.beginPath();
      ctx.moveTo(x, MARGIN.top);
      ctx.lineTo(x, MARGIN.top + plotHeight);
      ctx.stroke();
      ctx.fillText(String(value), x, MARGIN.top + plotHeight + 14);
    }
    ctx.textAlign = 'right';
    for (let value = 0; value <= m; value += niceStep(m)) {
      const y = MARGIN.top + value * scaleY;
      ctx.beginPath();
      ctx.moveTo(MARGIN.left, y);
      ctx.lineTo(MARGIN.left + plotWidth, y);
      ctx.stroke();
      ctx.fillText(String(value), MARGIN.left - 6, y + 4);
    }
    ctx.textAlign = 'center';
    ctx.fillText('Séquence 1 →', MARGIN.left + plotWidth / 2, SIZE - 8);
    ctx.save();
    ctx.translate(12, MARGIN.top + plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Séquence 2 →', 0, 0);
    ctx.restore();

    ctx.strokeStyle = COLORS.frame;
    ctx.strokeRect(MARGIN.left, MARGIN.top, plotWidth, plotHeight);

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
        ctx.moveTo(MARGIN.left + (i + 0.5) * scaleX, MARGIN.top + (j + 0.5) * scaleY);
        ctx.lineTo(MARGIN.left + (i + k - 0.5) * scaleX, MARGIN.top + (j + k - 0.5) * scaleY);
      }
      ctx.stroke();
    } else {
      // Trop de points pour des segments : on dessine de simples pixels.
      ctx.fillStyle = COLORS.dot;
      for (let p = 0; p < count; p += 1) {
        ctx.fillRect(MARGIN.left + points[p * 2] * scaleX, MARGIN.top + points[p * 2 + 1] * scaleY, Math.max(1, scaleX), Math.max(1, scaleY));
      }
    }
  }, [points, k, n, m]);

  function onMouseMove(event: React.MouseEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const { scaleX, scaleY, plotWidth, plotHeight } = layout(n, m);
    // On repasse des pixels de l'écran aux coordonnées logiques du canvas.
    const x = ((event.clientX - rect.left) / rect.width) * SIZE - MARGIN.left;
    const y = ((event.clientY - rect.top) / rect.height) * SIZE - MARGIN.top;
    if (x < 0 || y < 0 || x >= plotWidth || y >= plotHeight) return setHover(null);
    setHover({ i: Math.floor(x / scaleX), j: Math.floor(y / scaleY) });
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
    </div>
  );
}
