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
      {sectors.map((s) => (
        <g key={s.key}>
          <circle cx={X(s.level)} cy={Y(s.momentum)} r={s.expected ? 8 : 6} fill={COL[s.quadrant]} fillOpacity={0.85} stroke={s.expected ? '#fff' : 'none'} strokeWidth={1.5} />
          <text x={X(s.level) + 11} y={Y(s.momentum) + 4} fontSize={12} fill="#fff">{s.name.replace('Consumer ', '').replace('Communication Services', 'Communication').replace('Nifty ', '')}</text>
        </g>
      ))}
    </svg>
  );
}
