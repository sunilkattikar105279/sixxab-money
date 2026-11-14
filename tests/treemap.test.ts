import { describe, expect, it } from 'vitest';
import { squarify } from '@/lib/treemap';
import { bySector, heatColor } from '@/lib/data/stocks';

describe('treemap', () => {
  it('fills the box exactly with areas proportional to weight', () => {
    const out = squarify([{ item: 'a', weight: 6 }, { item: 'b', weight: 3 }, { item: 'c', weight: 1 }], { x: 0, y: 0, w: 100, h: 50 });
    const area = (k: string) => { const r = out.find((o) => o.item === k)!; return r.w * r.h; };
    expect(out).toHaveLength(3);
    expect(area('a') + area('b') + area('c')).toBeCloseTo(5000, 6);
    expect(area('a') / area('c')).toBeCloseTo(6, 6);
    out.forEach((r) => { expect(r.x).toBeGreaterThanOrEqual(-1e-9); expect(r.x + r.w).toBeLessThanOrEqual(100 + 1e-9); expect(r.y + r.h).toBeLessThanOrEqual(50 + 1e-9); });
  });
  it('handles empty input', () => {
    expect(squarify([], { x: 0, y: 0, w: 10, h: 10 })).toEqual([]);
  });
});

describe('sectors', () => {
  it('groups and averages known changes', () => {
    const g = bySector([
      { symbol: 'A', name: 'A', sector: 'Tech', price: null, changePct: 2, marketCap: null },
      { symbol: 'B', name: 'B', sector: 'Tech', price: null, changePct: -4, marketCap: null },
      { symbol: 'C', name: 'C', sector: 'Energy', price: null, changePct: null, marketCap: null },
    ]);
    expect(g[0].sector).toBe('Tech');
    expect(g[0].avgChange).toBeCloseTo(-1, 6);
    expect(g[1].avgChange).toBeNull();
  });
  it('colours gains green and losses red', () => {
    expect(heatColor(null)).toBe('#1C2E4A');
    expect(heatColor(2.9)).not.toBe(heatColor(-2.9));
  });
});
