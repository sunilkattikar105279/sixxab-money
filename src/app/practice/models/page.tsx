import type { Metadata } from 'next';
import Link from 'next/link';
import { Header, Footer } from '@/components/Header';
import { EducationBar, MixBar, PracticeNav, monthYear, pct } from '@/components/Practice';
import { MODEL_SETS, isModelMarket, stockShare, type HistoryStats, type ModelKey } from '@/lib/models';
import { modelHistory } from '@/lib/data/models';

export const metadata: Metadata = { title: 'Model portfolios for learning', description: 'Five example asset mixes for the US, India and global markets, and how each one behaved over the last five years. Education only.' };

const LINE: Record<ModelKey, string> = { preserve: '#7C8BA1', conservative: '#5B8DEF', balanced: '#2BB3A3', growth: '#C9A227', aggressive: '#E8705A' };

function Curves({ data }: { data: { key: ModelKey; name: string; s: HistoryStats }[] }) {
  if (!data.length) return null;
  const W = 760, H = 260, L = 44, R = 12, T = 12, B = 28;
  const all = data.flatMap((d) => d.s.curve);
  const t0 = Math.min(...all.map((p) => p.t)), t1 = Math.max(...all.map((p) => p.t));
  const lo = Math.min(...all.map((p) => p.v)), hi = Math.max(...all.map((p) => p.v));
  const step = hi - lo > 80 ? 25 : 10;
  const y0 = Math.floor(lo / step) * step, y1 = Math.ceil(hi / step) * step;
  const X = (t: number) => L + (t - t0) / (t1 - t0 || 1) * (W - L - R);
  const Y = (v: number) => T + (1 - (v - y0) / (y1 - y0 || 1)) * (H - T - B);
  const ticks: number[] = []; for (let v = y0; v <= y1; v += step) ticks.push(v);
  const years: number[] = []; for (let y = new Date(t0).getUTCFullYear() + 1; y <= new Date(t1).getUTCFullYear(); y++) years.push(y);
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Growth of 100 for each model: ${data.map((d) => `${d.name} ${d.s.growthOf100.toFixed(0)}`).join(', ')}`}>
        {ticks.map((v) => <g key={v}><line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--line2)" strokeWidth={v === 100 ? 1.5 : 0.75} /><text x={L - 6} y={Y(v) + 4} textAnchor="end" fontSize="11" fill="var(--dim)">{v}</text></g>)}
        {years.map((y) => { const x = X(Date.UTC(y, 0, 1)); return <text key={y} x={x} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--dim)">{y}</text>; })}
        {data.map((d) => <polyline key={d.key} fill="none" stroke={LINE[d.key]} strokeWidth="2" points={d.s.curve.map((p) => `${X(p.t).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ')} />)}
      </svg>
      <figcaption style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 13 }}>
        {data.map((d) => <span key={d.key}><span aria-hidden style={{ display: 'inline-block', width: 14, height: 3, background: LINE[d.key], marginRight: 6, verticalAlign: 'middle' }} />{d.name}</span>)}
      </figcaption>
    </figure>
  );
}

export default async function Models({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const sp = await searchParams;
  const market = isModelMarket(sp.m) ? sp.m : 'US';
  const set = MODEL_SETS[market];
  const h = await modelHistory(market);
  const rows = set.models.map((m) => ({ m, s: h.stats[m.key] }));
  const withStats = rows.filter((r) => r.s).map((r) => ({ key: r.m.key, name: r.m.name, s: r.s! }));
  return (
    <>
      <Header active="Practice" />
      <main className="wrap" id="main">
        <EducationBar>Five example mixes of stocks, bonds, gold and cash, from the calmest to the most volatile, and what each one actually did over the last five years.</EducationBar>
        <PracticeNav current="/practice/models" market={market} />

        <section className="card">
          <div className="tag teal">Model portfolios for learning · {set.label}{h.asOf ? ` · prices to ${h.asOf}` : ''}</div>
          <h1 style={{ margin: '6px 0 6px', fontSize: 28 }}>More stocks means more growth over time, and deeper falls along the way</h1>
          <p className="muted" style={{ margin: 0 }}>Each model is a fixed mix, rebalanced back to its targets every month. Compare the worst fall with the growth: the question to ask yourself is which fall you could sit through without selling. These are teaching examples, not a suggestion of which one fits you.</p>
        </section>

        {h.available ? (
          <section className="card" aria-label="Five years of model history">
            <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>100 invested five years ago</h2>
            <p className="dim" style={{ margin: '0 0 8px', fontSize: 13 }}>{withStats[0] ? `${withStats[0].s.start} to ${withStats[0].s.end}` : ''}. Before taxes and fund fees. Past results are history, not a promise.</p>
            <Curves data={withStats} />
            <div className="scroll" style={{ marginTop: 12 }}>
              <table className="compact">
                <thead><tr><th>Model</th><th>Stocks</th><th>100 became</th><th>Per year</th><th>Worst fall</th><th>Back to the old high</th><th>Worst year</th><th>Best year</th></tr></thead>
                <tbody>{rows.map(({ m, s }) => (
                  <tr key={m.key}>
                    <td><a href={`#${m.key}`}>{m.name}</a></td>
                    <td className="mono">{stockShare(set, m)}%</td>
                    <td className="mono">{s ? s.growthOf100.toFixed(0) : '—'}</td>
                    <td className="mono">{s ? pct(s.cagr, 1) : '—'}</td>
                    <td className="mono" style={{ color: 'var(--red)' }}>{s ? `${(100 * s.maxDrawdown).toFixed(0)}%` : '—'}</td>
                    <td>{s ? (s.recoveredOn ? monthYear(s.recoveredOn) : 'not yet') : '—'}</td>
                    <td className="mono">{s?.worstYear ? `${pct(s.worstYear.ret)} (${s.worstYear.year})` : '—'}</td>
                    <td className="mono">{s?.bestYear ? `${pct(s.bestYear.ret)} (${s.bestYear.year})` : '—'}</td>
                  </tr>))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="card"><p className="muted" style={{ margin: 0 }}>Five-year history loads from the market data feed. The mixes are below; the history appears once the feed responds.</p>{(h.missing.length > 0 || h.days > 0) && <p className="dim" style={{ margin: '6px 0 0', fontSize: 12 }}>{h.missing.length ? `Waiting on: ${h.missing.join(', ')}.` : ''} {h.days ? `${h.days} shared trading days so far.` : ''}</p>}</section>
        )}

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
          {rows.map(({ m, s }) => (
            <section key={m.key} id={m.key} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="hub-head"><h2 style={{ margin: 0, fontSize: 20 }}>{m.name}</h2><span className="chip flat">{stockShare(set, m)}% stocks</span></div>
              <p style={{ margin: 0 }}>{m.teaches}</p>
              <MixBar set={set} model={m} />
              {s && (
                <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                  Its worst fall was <b style={{ color: 'var(--red)' }}>{(100 * s.maxDrawdown).toFixed(0)}%</b>, from {monthYear(s.drawdownFrom)} to {monthYear(s.drawdownTo)}, {s.recoveredOn ? `and it was back at its old high by ${monthYear(s.recoveredOn)}` : 'and it has not yet returned to that high'}. Over five years, 100 became <b style={{ color: '#fff' }}>{s.growthOf100.toFixed(0)}</b>.
                </p>
              )}
              <Link href={`/practice/paper?m=${market}&model=${m.key}`} className="btn btn-line" style={{ alignSelf: 'flex-start', marginTop: 'auto' }}>Practise this mix on paper</Link>
            </section>
          ))}
        </div>

        <section className="card">
          <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>How to read this</h2>
          <ul className="how">
            <li><b>Worst fall</b> is the biggest drop from a high point to a low point. It is the number most people underestimate before they live through it.</li>
            <li><b>Back to the old high</b> shows how long the patience had to last. Selling during the fall locks the loss in.</li>
            <li><b>Rebalancing</b> means selling a little of what rose and buying what fell to get back to the targets. It is what keeps a mix a mix.</li>
            <li>Five years is a short window. Other periods, such as 2000 or 2008, had larger falls than anything shown here.</li>
          </ul>
          <p className="dim" style={{ margin: '10px 0 0', fontSize: 12 }}>{set.note} Proxies: {set.assets.map((a) => `${a.label}: ${a.proxy}`).join(' · ')}.</p>
        </section>
      </main>
      <Footer note="Model portfolios for learning · Education only, not a recommendation" />
    </>
  );
}
