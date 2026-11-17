import type { RegimeRead, Zone } from '@/lib/regime';
import { THRESHOLDS, ZONE_WORDS } from '@/lib/regime';

const COLOR: Record<Zone, string> = { calm: 'var(--green)', normal: 'var(--teal)', elevated: 'var(--gold)', panic: 'var(--red)' };

/** Fear gauge: where today sits across the four zones, the 1-year line, and what the engine does about it. */
export function RiskMeter({ r, compact = false }: { r: RegimeRead | null; compact?: boolean }) {
  if (!r) return compact ? null : (
    <section className="card"><h2 style={{ marginBottom: 6 }}>Sigma · Market risk meter</h2><p className="muted" style={{ margin: 0 }}>The fear gauge appears after the next nightly market update.</p></section>
  );
  const [a, b, c] = THRESHOLDS[r.market];
  const max = Math.max(c * 1.5, r.level * 1.1);
  const pct = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
  if (compact) return (
    <p style={{ margin: 0, fontSize: 14 }}>
      <b>Sigma (market regime):</b> <span style={{ color: COLOR[r.zone], fontWeight: 600 }}>{r.zone}</span> ({r.gauge} {r.level.toFixed(1)}).{' '}
      {r.zone === 'elevated' ? 'Breakouts fail more often when fear is elevated; the engine halves sizes.' : r.zone === 'panic' ? 'In panic the engine takes no new paper entries.' : 'Normal sizing.'}
    </p>
  );
  const hist = r.history.map((p) => p.value);
  const lo = Math.min(...hist), hi = Math.max(...hist), span = hi - lo || 1, W = 300, H = 60;
  const line = hist.map((v, i) => `${((i / Math.max(1, hist.length - 1)) * W).toFixed(1)},${(H - 4 - ((v - lo) / span) * (H - 8)).toFixed(1)}`).join(' ');
  const yOf = (v: number) => (H - 4 - ((v - lo) / span) * (H - 8)).toFixed(1);
  return (
    <section className="card" id="risk" aria-label={`Sigma ${r.gauge} risk meter`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Sigma · Market risk meter <span className="dim" style={{ fontSize: 14, fontWeight: 400 }}>{r.gauge}</span></h2>
        <span className="dim" style={{ fontSize: 12 }}>as of {r.asOf}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '8px 0' }}>
        <span style={{ font: '700 36px var(--head)', color: COLOR[r.zone] }}>{r.level.toFixed(1)}</span>
        <span style={{ fontWeight: 600, color: COLOR[r.zone], textTransform: 'capitalize' }}>{r.zone}</span>
        <span className="dim" style={{ fontSize: 13 }}>{r.change5dPct >= 0 ? '+' : ''}{r.change5dPct}% in 5 days · {r.pct1y}th percentile of the year</span>
      </div>
      <div role="img" aria-label={`Zones: calm under ${a}, normal ${a} to ${b}, elevated ${b} to ${c}, panic above ${c}`} style={{ position: 'relative', height: 14, borderRadius: 7, overflow: 'hidden', display: 'flex' }}>
        <div style={{ width: pct(a), background: COLOR.calm, opacity: 0.5 }} />
        <div style={{ width: `calc(${pct(b)} - ${pct(a)})`, background: COLOR.normal, opacity: 0.5 }} />
        <div style={{ width: `calc(${pct(c)} - ${pct(b)})`, background: COLOR.elevated, opacity: 0.5 }} />
        <div style={{ flex: 1, background: COLOR.panic, opacity: 0.5 }} />
        <div style={{ position: 'absolute', left: pct(r.level), top: -2, bottom: -2, width: 3, background: '#fff', transform: 'translateX(-1px)' }} />
      </div>
      <div className="dim" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 2 }}><span>calm</span><span>{a}</span><span>{b}</span><span>{c}</span><span>panic</span></div>
      <p style={{ margin: '8px 0 4px' }}>{ZONE_WORDS[r.zone]}. {r.summary.split('. ').slice(1).join('. ')}</p>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img" aria-label={`${r.gauge} over the past year, from ${hist[0]} to ${hist.at(-1)}`}>
        {[b, c].filter((v) => v > lo && v < hi).map((v) => <line key={v} x1={0} x2={W} y1={yOf(v)} y2={yOf(v)} stroke={v === c ? 'var(--red)' : 'var(--gold)'} strokeDasharray="3 3" strokeWidth={1} vectorEffect="non-scaling-stroke" />)}
        <polyline points={line} fill="none" stroke={COLOR[r.zone]} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
      </svg>
      {r.breadth && <p style={{ margin: '6px 0 0', fontSize: 14 }}><b>Breadth:</b> {r.breadth.read}. {r.breadth.pctAbove200 ?? '—'}% of the {r.breadth.n} stocks we scan are above their 200-day average, {r.breadth.pctAbove50 ?? '—'}% above the 50-day; {r.breadth.advancers} rose and {r.breadth.decliners} fell today; {r.breadth.newHighs} new 52-week highs, {r.breadth.newLows} new lows.</p>}
      {(r.signals.length > 0 || r.volume) && <ul className="muted" style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13 }}>
        {r.signals.map((s) => <li key={s}>{s}</li>)}
        {r.volume && <li>Volume: {r.volume.read} ({r.volume.ratio}x the 20-day average)</li>}
      </ul>}
      <p className="dim" style={{ margin: '6px 0 0', fontSize: 12 }}>The fear gauge measures expected swings, not direction. Educational, not a recommendation.</p>
    </section>
  );
}
