import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { comparePairs } from '../../src/core/dotplot/segments';
import { Ribbons } from '../../src/viz/Ribbons';
import { DotpathTool } from '../../src/tools/dotpath/DotpathTool';
import { MARGIN, WIDTH, identityColor, ribbonLayout, ribbonPath } from '../../src/viz/ribbonGeometry';

const numbers = (path: string) => [...path.matchAll(/-?\d+\.\d/g)].map((m) => Number(m[0]));

describe('ribbonLayout', () => {
  it('utilise la même échelle pour toutes les barres', () => {
    const layout = ribbonLayout([100, 50, 25]);
    expect(layout.bars[0].width).toBeCloseTo(WIDTH - MARGIN.left - MARGIN.right);
    expect(layout.bars[1].width).toBeCloseTo(layout.bars[0].width / 2);
    expect(layout.bars[2].width).toBeCloseTo(layout.bars[0].width / 4);
    expect(layout.bars[1].y).toBeGreaterThan(layout.bars[0].y);
  });
});

describe('ribbonPath', () => {
  const segment = { aStart: 0, aEnd: 49, bStart: 0, bEnd: 49, length: 50, matches: 50, identity: 1, diagonal: 0 };

  it('relie des positions identiques par un ruban vertical', () => {
    const layout = ribbonLayout([100, 100]);
    const xs = numbers(ribbonPath(layout, 0, 1, segment)).filter((_, index) => index % 2 === 0);
    expect(Math.min(...xs)).toBeCloseTo(MARGIN.left, 0);
    expect(Math.max(...xs)).toBeCloseTo(MARGIN.left + 50 * layout.scale, 0);
  });

  it('un segment décalé penche du côté du décalage', () => {
    const layout = ribbonLayout([100, 100]);
    const shifted = { ...segment, bStart: 50, bEnd: 99, diagonal: 50 };
    // Le chemin contient, dans l'ordre : x1 (haut gauche), x2 (haut droit), x3 (bas droit), x4 (bas gauche).
    const n = numbers(ribbonPath(layout, 0, 1, shifted));
    const [x1, x2, x3, x4] = [n[0], n[2], n[8], n[10]];
    expect(x1).toBeCloseTo(MARGIN.left, 0);
    expect(x4).toBeGreaterThan(x1); // le bas du ruban est décalé vers la droite
    expect(x3).toBeGreaterThan(x2);
    expect(x3 - x4).toBeCloseTo(x2 - x1, 0); // même largeur en haut et en bas
  });
});

describe('identityColor', () => {
  it('va de l\'orange au bleu foncé et se borne à 50 %', () => {
    expect(identityColor(1)).toBe('rgb(31, 58, 95)');
    expect(identityColor(0.5)).toBe('rgb(244, 162, 89)');
    expect(identityColor(0.1)).toBe(identityColor(0.5));
  });
});

describe('Ribbons (rendu)', () => {
  const sequences = ['ATGCGTACCGGATTACAGCT', 'ATGCGTACCGGATTACAGCT', 'TTTTATGCGTACCGGATTACAGCT'];
  const pairs = comparePairs(sequences, { k: 5 });

  it('dessine un ruban par segment, avec une infobulle lisible', () => {
    const html = renderToStaticMarkup(createElement(Ribbons, { labels: ['A', 'B', 'C'], lengths: sequences.map((s) => s.length), pairs }));
    const segmentCount = pairs.reduce((sum, p) => sum + p.segments.length, 0);
    expect(segmentCount).toBe(3);
    expect(html.match(/class="ribbon"/g)).toHaveLength(segmentCount);
    expect(html).toContain('A 1–20 ↔ B 1–20 · 100 % d&#x27;identité · 20 lettres');
    expect(html).toContain('aria-label="Carte de similarité : 3 segments entre 3 séquences"');
  });
});

describe('DotpathTool (rendu)', () => {
  const items = [
    { label: 'Séquence 1', sequence: 'ATGCGTACCGGATTACAGCTAGCTAGGATTACATTGCAAGCT' },
    { label: 'Séquence 2', sequence: 'ATGCGTACCGGATTACATTGCAAGCTCCCCTAGCTAG' },
    { label: 'Séquence 3', sequence: 'ATGCGTACCGGATTACAGCT' },
  ];

  it('affiche les rubans, la matrice et une case à cocher par paire', () => {
    const html = renderToStaticMarkup(createElement(DotpathTool, { items }));
    expect(html).toContain('<svg');
    expect(html).toContain('<table');
    expect(html.match(/type="checkbox"/g)).toHaveLength(3);
    expect(html).toContain('class="ribbon"');
  });

  it('demande plus de séquences s\'il n\'y en a qu\'une', () => {
    const html = renderToStaticMarkup(createElement(DotpathTool, { items: items.slice(0, 1) }));
    expect(html).toContain('au moins deux séquences');
    expect(html).not.toContain('<svg');
  });
});
