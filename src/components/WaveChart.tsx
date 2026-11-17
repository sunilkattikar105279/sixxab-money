import type { WavePoint } from '@/lib/ta/elliott';

/** Small line through the counted swings, each labelled 0-5 / A-C, with the invalidation level dashed. */
export default function WaveChart({ points, invalidation, showPrices }: { points: WavePoint[]; invalidation: number | null | undefined; showPrices: boolean }) {
  if (points.length < 3) return null;
  const W = 300, H = 150, pad = 30;
  const prices = points.map((p) => p.price).concat(invalidation ?? []);
  const lo = Math.min(...prices), hi = Math.max(...prices);
  const t0 = points[0].t, t1 = points.at(-1)!.t || t0 + 1;
  const X = (t: number) => pad + ((t - t0) / Math.max(1, t1 - t0)) * (W - 2 * pad);
  const Y = (p: number) => pad + (1 - (p - lo) / Math.max(1e-9, hi - lo)) * (H - 2 * pad);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)} ${Y(p.price).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Elliott wave swing chart" style={{ margin: '8px 0' }}>
      {invalidation != null && <line x1={pad} x2={W - pad} y1={Y(invalidation)} y2={Y(invalidation)} stroke="var(--red)" strokeDasharray="4 4" strokeWidth={1} />}
      <path d={path} fill="none" stroke="var(--gold)" strokeWidth={1.6} />
      {points.map((p, i) => {
        const up = i > 0 ? p.price >= points[i - 1].price : (points[1]?.price ?? p.price) < p.price;
        return (
          <g key={i}>
            <circle cx={X(p.t)} cy={Y(p.price)} r={p.label === 'now' ? 3.5 : 2.5} fill={p.label === 'now' ? '#fff' : 'var(--gold)'} />
            <text x={X(p.t)} y={Y(p.price) + (up ? -7 : 14)} textAnchor="middle" fontSize={10} fill="#fff">{p.label}</text>
            {showPrices && p.label !== 'now' && <text x={X(p.t)} y={Y(p.price) + (up ? -17 : 24)} textAnchor="middle" fontSize={8} fill="var(--muted, #9aa)">{p.price}</text>}
          </g>
        );
      })}
    </svg>
  );
}
