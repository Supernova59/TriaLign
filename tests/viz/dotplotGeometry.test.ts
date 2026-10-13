import { describe, expect, it } from 'vitest';
import { MARGIN, SIZE, canvasToCell, cellCenter, layout, niceStep } from '../../src/viz/dotplotGeometry';

describe('géométrie du dotplot', () => {
  it('l\'origine est en bas à gauche, la dernière case en haut à droite', () => {
    const l = layout(40, 30);
    const first = cellCenter(l, 0, 0);
    const last = cellCenter(l, 39, 29);
    expect(first.x).toBeLessThan(last.x);
    expect(first.y).toBeGreaterThan(last.y); // y du canvas descend : « plus grand » = plus bas
    expect(first.y).toBeLessThan(MARGIN.top + l.plotHeight);
    expect(last.y).toBeGreaterThan(MARGIN.top);
  });

  it('une diagonale i = j monte vers la droite', () => {
    const l = layout(20, 20);
    const a = cellCenter(l, 2, 2);
    const b = cellCenter(l, 10, 10);
    expect(b.x).toBeGreaterThan(a.x);
    expect(b.y).toBeLessThan(a.y);
  });

  it('canvasToCell est l\'inverse de cellCenter (100 cas aléatoires)', () => {
    for (let t = 0; t < 100; t++) {
      const n = 1 + Math.floor(Math.random() * 300);
      const m = 1 + Math.floor(Math.random() * 300);
      const l = layout(n, m);
      const i = Math.floor(Math.random() * n);
      const j = Math.floor(Math.random() * m);
      const { x, y } = cellCenter(l, i, j);
      expect(canvasToCell(l, x, y, n, m)).toEqual({ i, j });
    }
  });

  it('renvoie null en dehors du graphique', () => {
    const l = layout(10, 10);
    expect(canvasToCell(l, 5, 5, 10, 10)).toBeNull();
    expect(canvasToCell(l, SIZE - 2, SIZE - 2, 10, 10)).toBeNull();
    expect(canvasToCell(l, MARGIN.left - 1, MARGIN.top + 10, 10, 10)).toBeNull();
  });

  it('niceStep donne des pas ronds', () => {
    expect([niceStep(42), niceStep(100), niceStep(1000), niceStep(7)]).toEqual([10, 20, 200, 1]);
  });
});
