// Géométrie du dotplot, séparée du dessin pour pouvoir la tester.
// Convention : séquence 1 en horizontal, séquence 2 en vertical, origine en BAS à gauche.

export const SIZE = 560; // taille logique du canvas
export const MARGIN = { left: 52, top: 12, right: 12, bottom: 40 };

export interface DotplotLayout {
  plotWidth: number;
  plotHeight: number;
  scaleX: number;
  scaleY: number;
  /** Abscisse (en pixels du canvas) de la graduation « value » de la séquence 1. */
  xAt: (value: number) => number;
  /** Ordonnée (en pixels du canvas) de la graduation « value » de la séquence 2 (0 = bas). */
  yAt: (value: number) => number;
}

export function layout(firstLength: number, secondLength: number): DotplotLayout {
  const plotWidth = SIZE - MARGIN.left - MARGIN.right;
  const plotHeight = SIZE - MARGIN.top - MARGIN.bottom;
  const scaleX = plotWidth / Math.max(1, firstLength);
  const scaleY = plotHeight / Math.max(1, secondLength);
  return {
    plotWidth,
    plotHeight,
    scaleX,
    scaleY,
    xAt: (value) => MARGIN.left + value * scaleX,
    yAt: (value) => MARGIN.top + plotHeight - value * scaleY,
  };
}

/** Centre de la case (i, j), positions à partir de 0. */
export function cellCenter(l: DotplotLayout, i: number, j: number) {
  return { x: l.xAt(i + 0.5), y: l.yAt(j + 0.5) };
}

/** Case située sous le point (px, py) du canvas, ou null si on est hors du graphique. */
export function canvasToCell(l: DotplotLayout, px: number, py: number, firstLength: number, secondLength: number) {
  const x = px - MARGIN.left;
  const y = MARGIN.top + l.plotHeight - py; // l'axe vertical est inversé
  if (x < 0 || y < 0 || x >= l.plotWidth || y >= l.plotHeight) return null;
  return {
    i: Math.min(firstLength - 1, Math.floor(x / l.scaleX)),
    j: Math.min(secondLength - 1, Math.floor(y / l.scaleY)),
  };
}

// Pas « rond » (1, 2, 5, 10, 20, 50...) pour avoir environ 5 graduations.
export function niceStep(length: number): number {
  const raw = Math.max(1, length / 5);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const ratio = raw / magnitude;
  return (ratio < 1.5 ? 1 : ratio < 3.5 ? 2 : ratio < 7.5 ? 5 : 10) * magnitude;
}
