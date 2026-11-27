/** Growth of $100: the portfolio (teal) against the benchmark (gold), both on one scale. */
export function PortfolioChart({ curve, bench = 'S&P 500', height = 220, mini = false }: { curve: { d: string; v: number; bench: number }[]; bench?: string; height?: number; mini?: boolean }) {
  if (curve.length < 3) return null;
  const W = mini ? 300 : 760, H = mini ? 70 : height, pad = mini ? 4 : 20, left = mini ? 0 : 44;
  const vals = curve.flatMap((c) => [c.v, c.bench]), lo = Math.min(...vals), hi = Math.max(...vals);
  const t0 = Date.parse(curve[0].d), t1 = Date.parse(curve.at(-1)!.d);
  const x = (d: string) => left + ((Date.parse(d) - t0) / Math.max(1, t1 - t0)) * (W - left - (mini ? 0 : 12));
  const y = (v: number) => H - pad - ((v - lo) / (hi - lo || 1)) * (H - 2 * pad);
  const path = (k: 'v' | 'bench') => curve.map((c, i) => `${i ? 'L' : 'M'}${x(c.d).toFixed(1)} ${y(c[k]).toFixed(1)}`).join(' ');
  const last = curve.at(-1)!;
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={mini ? H : undefined} preserveAspectRatio={mini ? 'none' : undefined} role="img" aria-label={`Growth of $100: ${last.v.toFixed(0)} vs ${bench} ${last.bench.toFixed(0)}`}>
        {!mini && [lo, (lo + hi) / 2, hi].map((g) => <text key={g} x={38} y={y(g) + 4} fontSize={10} fill="var(--dim)" textAnchor="end">${g.toFixed(0)}</text>)}
        <path d={path('bench')} fill="none" stroke="var(--gold)" strokeWidth={mini ? 1.2 : 1.6} vectorEffect="non-scaling-stroke" opacity={0.8} />
        <path d={path('v')} fill="none" stroke="var(--teal)" strokeWidth={mini ? 1.6 : 2.2} vectorEffect="non-scaling-stroke" />
        {!mini && <><text x={left} y={H - 2} fontSize={10} fill="var(--dim)">{curve[0].d.slice(0, 4)}</text><text x={W - 12} y={H - 2} fontSize={10} fill="var(--dim)" textAnchor="end">{last.d.slice(0, 7)}</text></>}
      </svg>
      {!mini && <figcaption style={{ display: 'flex', gap: 16, fontSize: 13 }}><span style={{ color: 'var(--teal)' }}>━ Portfolio ${last.v.toFixed(0)}</span><span style={{ color: 'var(--gold)' }}>━ {bench} ${last.bench.toFixed(0)}</span><span className="dim">growth of $100</span></figcaption>}
    </figure>
  );
}
