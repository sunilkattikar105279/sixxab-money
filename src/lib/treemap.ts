// Squarified treemap (Bruls, Huizing, van Wijk). Lays weighted items into a rectangle so tiles stay close to square.
export interface Rect { x: number; y: number; w: number; h: number }
export interface Placed<T> extends Rect { item: T }

export function squarify<T>(items: { item: T; weight: number }[], box: Rect): Placed<T>[] {
  const total = items.reduce((a, i) => a + Math.max(0, i.weight), 0);
  if (!items.length || total <= 0 || box.w <= 0 || box.h <= 0) return [];
  const scale = (box.w * box.h) / total;
  const queue = [...items].filter((i) => i.weight > 0).sort((a, b) => b.weight - a.weight).map((i) => ({ item: i.item, area: i.weight * scale }));
  const out: Placed<T>[] = [];
  let free = { ...box };
  let row: typeof queue = [];

  const worst = (r: typeof queue, side: number) => {
    const s = r.reduce((a, i) => a + i.area, 0);
    const max = Math.max(...r.map((i) => i.area)), min = Math.min(...r.map((i) => i.area));
    return Math.max((side * side * max) / (s * s), (s * s) / (side * side * min));
  };
  const layRow = (r: typeof queue) => {
    const s = r.reduce((a, i) => a + i.area, 0);
    if (free.w >= free.h) {
      const w = s / free.h; let y = free.y;
      r.forEach((i) => { const h = i.area / w; out.push({ item: i.item, x: free.x, y, w, h }); y += h; });
      free = { x: free.x + w, y: free.y, w: free.w - w, h: free.h };
    } else {
      const h = s / free.w; let x = free.x;
      r.forEach((i) => { const w = i.area / h; out.push({ item: i.item, x, y: free.y, w, h }); x += w; });
      free = { x: free.x, y: free.y + h, w: free.w, h: free.h - h };
    }
  };

  while (queue.length) {
    const next = queue[0];
    const side = Math.min(free.w, free.h);
    if (!row.length || worst([...row, next], side) <= worst(row, side)) { row.push(next); queue.shift(); }
    else { layRow(row); row = []; }
  }
  if (row.length) layRow(row);
  return out;
}
