import type { Obs } from '@/lib/macro';
import type { Relation, Tile } from '@/lib/data/macro';

function path(s: Obs[], W: number, H: number, pad: number, lo: number, hi: number, x: (d: string) => number) {
  const span = hi - lo || 1;
  return s.map((o, i) => `${i ? 'L' : 'M'}${x(o.date).toFixed(1)} ${(H - pad - ((o.value - lo) / span) * (H - 2 * pad)).toFixed(1)}`).join(' ');
}

export function Spark({ s, label }: { s: Obs[]; label: string }) {
  if (s.length < 3) return null;
  const W = 220, H = 44, t0 = Date.parse(s[0].date), t1 = Date.parse(s.at(-1)!.date) || t0 + 1;
  const v = s.map((o) => o.value), lo = Math.min(...v), hi = Math.max(...v);
  const x = (d: string) => ((Date.parse(d) - t0) / Math.max(1, t1 - t0)) * W;
  const zero = lo < 0 && hi > 0 ? H - 4 - ((0 - lo) / (hi - lo)) * (H - 8) : null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img" aria-label={`${label}: ${s[0].date.slice(0, 7)} ${s[0].value} to ${s.at(-1)!.date.slice(0, 7)} ${s.at(-1)!.value}`}>
      {zero !== null && <line x1={0} x2={W} y1={zero} y2={zero} stroke="var(--line2)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
      <path d={path(s, W, H, 4, lo, hi, x)} fill="none" stroke="var(--teal)" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function TileGrid({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="grid">
      {tiles.map((t) => (
        <article key={t.key} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="tag dim">{t.label}{t.date ? ` · ${t.date.slice(0, 7)}` : ''}</div>
          <div style={{ font: '700 26px var(--head)', color: t.tone === 'bad' ? 'var(--red)' : t.tone === 'good' ? 'var(--green)' : '#fff' }}>{t.value}</div>
          {t.sub && <div className="muted" style={{ fontSize: 13 }}>{t.sub}</div>}
          <Spark s={t.series} label={t.label} />
          <p className="dim" style={{ margin: 0, fontSize: 12 }}>{t.means}</p>
        </article>
      ))}
    </div>
  );
}

/** Two series on their own scales; `b` drawn as-is, `a` shifted forward by the lag so a lead shows as overlap. */
export function RelationChart({ rel }: { rel: Relation }) {
  const W = 680, H = 200, pad = 18;
  const shift = (d: string) => { const x = new Date(`${d}T00:00:00Z`); x.setUTCMonth(x.getUTCMonth() + rel.lag); return x.toISOString().slice(0, 10); };
  const a = rel.a.series.map((o) => ({ date: shift(o.date), value: o.value })), b = rel.b.series;
  if (a.length < 6 || b.length < 6) return null;
  const t0 = Math.min(Date.parse(a[0].date), Date.parse(b[0].date)), t1 = Math.max(Date.parse(a.at(-1)!.date), Date.parse(b.at(-1)!.date));
  const x = (d: string) => 40 + ((Date.parse(d) - t0) / Math.max(1, t1 - t0)) * (W - 80);
  const av = a.map((o) => o.value), bv = b.map((o) => o.value);
  const [alo, ahi, blo, bhi] = [Math.min(...av), Math.max(...av), Math.min(...bv), Math.max(...bv)];
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${rel.title}: ${rel.read}`}>
        <path d={path(a, W, H, pad, alo, ahi, x)} fill="none" stroke="var(--gold)" strokeWidth={2} />
        <path d={path(b, W, H, pad, blo, bhi, x)} fill="none" stroke="var(--teal)" strokeWidth={2} />
        <text x={4} y={14} fontSize={11} fill="var(--gold)">{ahi.toFixed(1)}</text><text x={4} y={H - 6} fontSize={11} fill="var(--gold)">{alo.toFixed(1)}</text>
        <text x={W - 4} y={14} fontSize={11} fill="var(--teal)" textAnchor="end">{bhi.toFixed(1)}</text><text x={W - 4} y={H - 6} fontSize={11} fill="var(--teal)" textAnchor="end">{blo.toFixed(1)}</text>
        <text x={40} y={H - 2} fontSize={10} fill="var(--dim)">{new Date(t0).toISOString().slice(0, 4)}</text><text x={W - 40} y={H - 2} fontSize={10} fill="var(--dim)" textAnchor="end">{new Date(t1).toISOString().slice(0, 4)}</text>
      </svg>
      <figcaption style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13 }}>
        <span style={{ color: 'var(--gold)' }}>━ {rel.a.label}{rel.lag ? ` (shifted ${rel.lag} months later)` : ''}</span>
        <span style={{ color: 'var(--teal)' }}>━ {rel.b.label}</span>
      </figcaption>
    </figure>
  );
}
