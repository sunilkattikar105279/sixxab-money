import type { CurvePoint } from '@/lib/credit';

/** Corporate (HQM) and Treasury yield curves by maturity, with the corporate curve a year ago dashed. */
export function CurveChart({ pts }: { pts: CurvePoint[] }) {
  const W = 680, H = 240, pl = 40, pr = 16, pt = 14, pb = 30;
  const vals = pts.flatMap((p) => [p.corp, p.ust, p.corpYearAgo]).filter((v): v is number => v !== null);
  if (vals.length < 4) return null;
  const lo = Math.floor(Math.min(...vals) * 2) / 2 - 0.25, hi = Math.ceil(Math.max(...vals) * 2) / 2 + 0.25;
  const X = (m: number) => pl + (Math.sqrt(m) - 1) / (Math.sqrt(30) - 1) * (W - pl - pr); // square-root spacing keeps the short end readable
  const Y = (v: number) => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
  const line = (k: 'corp' | 'ust' | 'corpYearAgo') => pts.filter((p) => p[k] !== null).map((p, i) => `${i ? 'L' : 'M'}${X(p.m).toFixed(1)},${Y(p[k]!).toFixed(1)}`).join(' ');
  const ticks: number[] = []; for (let v = Math.ceil(lo * 2) / 2; v <= hi; v += 0.5) ticks.push(Math.round(v * 10) / 10);
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Corporate and Treasury yield curves: ${pts.map((p) => `${p.m}y corporate ${p.corp ?? '—'}%, Treasury ${p.ust ?? '—'}%`).join('; ')}`}>
        {ticks.map((v) => <g key={v}><line x1={pl} x2={W - pr} y1={Y(v)} y2={Y(v)} stroke="#2a3c5a" strokeDasharray="3 4" /><text x={pl - 6} y={Y(v) + 4} textAnchor="end" fontSize={10} fill="#9fb0c8">{v.toFixed(1)}%</text></g>)}
        {pts.map((p) => <text key={p.m} x={X(p.m)} y={H - 10} textAnchor="middle" fontSize={11} fill="#9fb0c8">{p.m}y</text>)}
        {pts.map((p) => p.corp !== null && p.ust !== null ? <line key={`s${p.m}`} x1={X(p.m)} x2={X(p.m)} y1={Y(p.corp)} y2={Y(p.ust)} stroke="var(--gold)" strokeOpacity={0.35} strokeWidth={6} /> : null)}
        <path d={line('corpYearAgo')} fill="none" stroke="var(--gold)" strokeWidth={1.4} strokeDasharray="5 4" opacity={0.6} />
        <path d={line('ust')} fill="none" stroke="var(--teal)" strokeWidth={2.2} />
        <path d={line('corp')} fill="none" stroke="var(--gold)" strokeWidth={2.6} />
        {pts.map((p) => p.corp !== null ? <circle key={`c${p.m}`} cx={X(p.m)} cy={Y(p.corp)} r={3.5} fill="var(--gold)" /> : null)}
        {pts.map((p) => p.ust !== null ? <circle key={`u${p.m}`} cx={X(p.m)} cy={Y(p.ust)} r={3} fill="var(--teal)" /> : null)}
      </svg>
      <figcaption style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13 }}>
        <span style={{ color: 'var(--gold)' }}>━ Corporate (HQM, AAA–A)</span>
        <span style={{ color: 'var(--gold)', opacity: 0.7 }}>╌ Corporate a year ago</span>
        <span style={{ color: 'var(--teal)' }}>━ Treasury</span>
        <span className="dim">Shaded gap = credit spread at each maturity</span>
      </figcaption>
    </figure>
  );
}

/** Spread by rating, now vs 3 months ago: risk is priced in steps from AAA down to CCC. */
export function Ladder({ rows }: { rows: { label: string; value: number | null; prev: number | null }[] }) {
  const max = Math.max(1, ...rows.map((r) => Math.max(r.value ?? 0, r.prev ?? 0)));
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {rows.map((r) => {
        const d = r.value !== null && r.prev !== null ? r.value - r.prev : null;
        return (
          <div key={r.label} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 120px', gap: 10, alignItems: 'center', fontSize: 14 }}>
            <span style={{ color: '#fff', fontWeight: 600 }}>{r.label}</span>
            <div style={{ position: 'relative', height: 14, background: 'rgba(255,255,255,.06)', borderRadius: 7 }}>
              {r.prev !== null && <div style={{ position: 'absolute', top: -3, bottom: -3, left: `${(r.prev / max) * 100}%`, width: 2, background: 'var(--dim)' }} title="3 months ago" />}
              {r.value !== null && <div style={{ width: `${(r.value / max) * 100}%`, height: '100%', borderRadius: 7, background: 'linear-gradient(90deg,var(--teal),var(--gold))' }} />}
            </div>
            <span className="mono">{r.value === null ? '—' : `${r.value.toFixed(2)} pts`}{d !== null && <span style={{ color: d > 0 ? 'var(--red)' : 'var(--green)' }}> {d >= 0 ? '+' : ''}{d.toFixed(2)}</span>}</span>
          </div>
        );
      })}
    </div>
  );
}
