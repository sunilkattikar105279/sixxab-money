import type { SectorRead, Quadrant } from '@/lib/rotation';

const COL: Record<Quadrant, string> = { leading: 'var(--green)', weakening: 'var(--gold)', lagging: 'var(--red)', improving: 'var(--teal)' };

/** Relative rotation view: right = beating the index over 13 weeks, up = gaining over 4 weeks. Sectors tend to rotate clockwise. */
export function RotationChart({ sectors }: { sectors: SectorRead[] }) {
  const W = 760, H = 460, cx = W / 2, cy = H / 2, pad = 44;
  const mx = Math.max(4, ...sectors.map((s) => Math.abs(s.level))) * 1.15, my = Math.max(3, ...sectors.map((s) => Math.abs(s.momentum))) * 1.15;
  const X = (v: number) => cx + (v / mx) * (cx - pad), Y = (v: number) => cy - (v / my) * (cy - pad);
  const quad = (x: number, y: number, label: string, q: Quadrant, anchor: 'start' | 'end') => <text x={x} y={y} textAnchor={anchor} fontSize={13} fontWeight={700} fill={COL[q]}>{label}</text>;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Sector rotation: ${sectors.map((s) => `${s.name} ${s.quadrant}`).join(', ')}`}>
      <rect x={cx} y={pad / 2} width={cx - pad / 2} height={cy - pad / 2} fill="var(--green)" fillOpacity={0.06} />
      <rect x={cx} y={cy} width={cx - pad / 2} height={cy - pad / 2} fill="var(--gold)" fillOpacity={0.06} />
      <rect x={pad / 2} y={cy} width={cx - pad / 2} height={cy - pad / 2} fill="var(--red)" fillOpacity={0.06} />
      <rect x={pad / 2} y={pad / 2} width={cx - pad / 2} height={cy - pad / 2} fill="var(--teal)" fillOpacity={0.06} />
      <line x1={pad / 2} x2={W - pad / 2} y1={cy} y2={cy} stroke="var(--line2, #2a3c5a)" />
      <line x1={cx} x2={cx} y1={pad / 2} y2={H - pad / 2} stroke="var(--line2, #2a3c5a)" />
      {quad(W - pad, pad, 'LEADING', 'leading', 'end')}{quad(W - pad, H - pad + 10, 'WEAKENING', 'weakening', 'end')}
      {quad(pad, H - pad + 10, 'LAGGING', 'lagging', 'start')}{quad(pad, pad, 'IMPROVING', 'improving', 'start')}
      <text x={W - pad / 2} y={cy - 6} textAnchor="end" fontSize={11} fill="var(--muted, #9fb0c8)">stronger than index (13 wk) →</text>
      <text x={cx + 6} y={pad / 2 + 12} fontSize={11} fill="var(--muted, #9fb0c8)">↑ gaining (4 wk)</text>
      {placeLabels(sectors.map((s) => ({ key: s.key, x: X(s.level), y: Y(s.momentum), r: s.expected ? 8 : 6, text: short(s.name) })), W, H).map((l) => {
        const s = sectors.find((z) => z.key === l.key)!;
        return (
          <g key={s.key}>
            {l.leader && <line x1={l.px} y1={l.py} x2={l.lx} y2={l.ly} stroke="#9fb0c8" strokeOpacity={0.6} strokeWidth={1} />}
            <circle cx={l.px} cy={l.py} r={l.r} fill={COL[s.quadrant]} fillOpacity={0.85} stroke={s.expected ? '#fff' : 'none'} strokeWidth={1.5} />
            <text x={l.tx} y={l.ty} textAnchor={l.anchor} fontSize={13} fill="#fff" paintOrder="stroke" stroke="#0b1b33" strokeWidth={3} strokeLinejoin="round">{l.text}</text>
          </g>
        );
      })}
    </svg>
  );
}

const short = (n: string) => n.replace('Consumer ', '').replace('Communication Services', 'Communication').replace('Nifty ', '');

type Pt = { key: string; x: number; y: number; r: number; text: string };
type Placed = { key: string; px: number; py: number; r: number; text: string; tx: number; ty: number; anchor: 'start' | 'end' | 'middle'; lx: number; ly: number; leader: boolean };

/** Puts each label where it overlaps no other label or dot: right, left, above, below, then further out with a leader line. */
export function placeLabels(pts: Pt[], W: number, H: number): Placed[] {
  const CH = 7.4, LH = 16; // approx glyph width and line height at 13 px
  const boxes: { x0: number; y0: number; x1: number; y1: number }[] = pts.map((p) => ({ x0: p.x - p.r - 2, y0: p.y - p.r - 2, x1: p.x + p.r + 2, y1: p.y + p.r + 2 }));
  const hit = (b: { x0: number; y0: number; x1: number; y1: number }) => b.x0 < 4 || b.x1 > W - 4 || b.y0 < 4 || b.y1 > H - 4 || boxes.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
  // Place the most crowded points first so they get the best spots.
  const crowd = (p: Pt) => pts.filter((q) => Math.hypot(q.x - p.x, q.y - p.y) < 90).length;
  const order = [...pts].sort((a, b) => crowd(b) - crowd(a));
  const out = new Map<string, Placed>();
  for (const p of order) {
    const w = p.text.length * CH, g = p.r + 5;
    const tries: [number, number, 'start' | 'end' | 'middle'][] = [];
    for (const d of [0, 18, 36, 54]) {
      tries.push([p.x + g + d, p.y + 4, 'start'], [p.x - g - d, p.y + 4, 'end'], [p.x, p.y - g - 4 - d, 'middle'], [p.x, p.y + g + 12 + d, 'middle'],
        [p.x + g + d, p.y - 12 - d, 'start'], [p.x + g + d, p.y + 20 + d, 'start'], [p.x - g - d, p.y - 12 - d, 'end'], [p.x - g - d, p.y + 20 + d, 'end']);
    }
    let pick = tries[0], box = null as null | { x0: number; y0: number; x1: number; y1: number };
    for (const t of tries) {
      const x0 = t[2] === 'start' ? t[0] : t[2] === 'end' ? t[0] - w : t[0] - w / 2;
      const b = { x0: x0 - 2, y0: t[1] - LH + 4, x1: x0 + w + 2, y1: t[1] + 4 };
      if (!hit(b)) { pick = t; box = b; break; }
    }
    if (!box) { const x0 = pick[0]; box = { x0, y0: pick[1] - LH + 4, x1: x0 + w, y1: pick[1] + 4 }; }
    boxes.push(box);
    const lx = pick[2] === 'start' ? box.x0 : pick[2] === 'end' ? box.x1 : (box.x0 + box.x1) / 2, ly = pick[2] === 'middle' ? (pick[1] < p.y ? box.y1 : box.y0) : pick[1] - 4;
    out.set(p.key, { key: p.key, px: p.x, py: p.y, r: p.r, text: p.text, tx: pick[0], ty: pick[1], anchor: pick[2], lx, ly, leader: Math.hypot(lx - p.x, ly - p.y) > p.r + 10 });
  }
  return pts.map((p) => out.get(p.key)!);
}
