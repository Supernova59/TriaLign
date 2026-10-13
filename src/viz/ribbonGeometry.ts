import type { Segment } from '../core/dotplot/segments';

// Géométrie de la vue en rubans : les séquences sont des barres horizontales empilées,
// et chaque segment similaire est un ruban qui relie deux barres. Même échelle pour toutes les barres.

export const WIDTH = 760;
export const MARGIN = { left: 96, right: 20, top: 14, bottom: 40 };
export const BAR_HEIGHT = 22;
export const ROW_GAP = 130;

export interface Bar {
  index: number;
  x: number;
  y: number;
  width: number;
  length: number;
}

export interface RibbonLayout {
  width: number;
  height: number;
  /** Pixels par lettre, identique pour toutes les barres. */
  scale: number;
  bars: Bar[];
}

export function ribbonLayout(lengths: number[]): RibbonLayout {
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const scale = plotWidth / Math.max(1, ...lengths);
  const bars = lengths.map((length, index) => ({
    index,
    x: MARGIN.left,
    y: MARGIN.top + index * (BAR_HEIGHT + ROW_GAP),
    width: length * scale,
    length,
  }));
  const height = MARGIN.top + lengths.length * BAR_HEIGHT + Math.max(0, lengths.length - 1) * ROW_GAP + MARGIN.bottom;
  return { width: WIDTH, height, scale, bars };
}

const f = (value: number) => value.toFixed(1);

/**
 * Chemin SVG d'un ruban entre la barre du haut (séquence `upper`, positions du segment côté A)
 * et la barre du bas (séquence `lower`, positions côté B).
 */
export function ribbonPath(layout: RibbonLayout, upper: number, lower: number, segment: Segment): string {
  const top = layout.bars[upper];
  const bottom = layout.bars[lower];
  const x1 = top.x + segment.aStart * layout.scale;
  const x2 = top.x + (segment.aEnd + 1) * layout.scale;
  const x3 = bottom.x + (segment.bEnd + 1) * layout.scale;
  const x4 = bottom.x + segment.bStart * layout.scale;
  const yTop = top.y + BAR_HEIGHT;
  const yBottom = bottom.y;
  const yMid = (yTop + yBottom) / 2;
  return (
    `M ${f(x1)} ${f(yTop)} L ${f(x2)} ${f(yTop)} ` +
    `C ${f(x2)} ${f(yMid)}, ${f(x3)} ${f(yMid)}, ${f(x3)} ${f(yBottom)} ` +
    `L ${f(x4)} ${f(yBottom)} ` +
    `C ${f(x4)} ${f(yMid)}, ${f(x1)} ${f(yMid)}, ${f(x1)} ${f(yTop)} Z`
  );
}

const LOW = [244, 162, 89]; // orange : identité faible
const HIGH = [31, 58, 95]; // bleu foncé : identité élevée
export const COLOR_SCALE_MIN = 0.5;

/** Couleur d'un ruban : de l'orange (50 % d'identité ou moins) au bleu foncé (100 %). */
export function identityColor(identity: number): string {
  const t = Math.min(1, Math.max(0, (identity - COLOR_SCALE_MIN) / (1 - COLOR_SCALE_MIN)));
  const channel = (index: number) => Math.round(LOW[index] + (HIGH[index] - LOW[index]) * t);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}
