import type { Metadata } from 'next';
import { Header, Footer } from '@/components/Header';
import { getSentiment } from '@/lib/data/regime';
import { Dial, MOOD_COL } from '@/components/SentimentGauge';
import type { SentimentRead } from '@/lib/sentiment';

export const metadata: Metadata = { title: 'SIXXAB Sentiment', description: 'One fear-and-greed score for the US, India and world markets, with the money flows behind it.' };
export const revalidate = 600;

function HistoryChart({ h }: { h: SentimentRead['history'] }) {
  if (h.length < 20) return null;
  const W = 760, H = 220, pl = 34, pr = 10, pt = 10, pb = 24;
  const X = (i: number) => pl + (i / (h.length - 1)) * (W - pl - pr), Y = (v: number) => pt + (1 - v / 100) * (H - pt - pb);
  const line = (k: 'score' | 'us' | 'in' | 'global') => h.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p[k]).toFixed(1)}`).join(' ');
  const months = h.map((p, i) => ({ i, d: p.date })).filter((p, k, a) => k === 0 || p.d.slice(5, 7) !== a[k - 1].d.slice(5, 7));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="SIXXAB Sentiment over the last year">
      {[25, 45, 55, 75].map((v) => <line key={v} x1={pl} x2={W - pr} y1={Y(v)} y2={Y(v)} stroke="#2a3c5a" strokeDasharray="3 4" />)}
      {[0, 25, 50, 75, 100].map((v) => <text key={v} x={pl - 6} y={Y(v) + 4} textAnchor="end" fontSize={10} fill="#9fb0c8">{v}</text>)}
      {months.map((m) => <text key={m.i} x={X(m.i)} y={H - 6} fontSize={10} fill="#9fb0c8">{new Date(m.d + 'T12:00:00Z').toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })}</text>)}
      <path d={line('us')} stroke="#5B8DEF" strokeWidth={1.2} fill="none" opacity={0.7} />
      <path d={line('in')} stroke="#F59E5B" strokeWidth={1.2} fill="none" opacity={0.7} />
      <path d={line('global')} stroke="#2EC4B6" strokeWidth={1.2} fill="none" opacity={0.7} />
      <path d={line('score')} stroke="#fff" strokeWidth={2.4} fill="none" />
    </svg>
  );
}

export default async function Sentiment() {
  const s = await getSentiment();
  return (
    <>
      <Header active="Sentiment" />
      <main className="wrap" id="main">
        <section className="bar">
          <span className="tag gold">SIXXAB Sentiment{s ? ` · as of ${s.asOf} close` : ''}</span>
          <span style={{ flex: '1 1 480px' }}>One 0 to 100 read of investor mood: 0 is extreme fear, 100 is extreme greed. It blends the US (50%), the rest of the world (30%) and India (20%), using volatility, trend, momentum, breadth, credit, the dollar, the rupee and gold. It describes the mood; it does not predict tomorrow. Educational, not financial advice.</span>
        </section>
        {!s ? (
          <section className="card"><p className="muted" style={{ margin: 0 }}>The first SIXXAB Sentiment read appears here after tonight’s market update.</p></section>
        ) : (
          <>
            <section className="card sentiment-card">
              <div className="sentiment-row">
                <div style={{ textAlign: 'center', minWidth: 220 }}>
                  <Dial score={s.score} size={240} />
                  <div style={{ color: MOOD_COL[s.mood], fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>{s.mood}</div>
                </div>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <h2 style={{ marginTop: 0 }}>Where the money mood is</h2>
                  <p>{s.summary}</p>
                  {s.flows.notes.map((n) => <p key={n} className="muted">{n}</p>)}
                </div>
              </div>
            </section>
            <section className="card" aria-label="Last 12 months">
              <h2>Last 12 months</h2>
              <p className="muted" style={{ marginTop: 0, fontSize: 13 }}><b style={{ color: '#fff' }}>White</b> SIXXAB Sentiment · <b style={{ color: '#5B8DEF' }}>US</b> · <b style={{ color: '#F59E5B' }}>India</b> · <b style={{ color: '#2EC4B6' }}>World</b>. History uses prices and volatility only; breadth is added for today.</p>
              <HistoryChart h={s.history} />
            </section>
            <div className="grid">
              {s.regions.map((r) => (
                <section key={r.region} className="card">
                  <h2 style={{ marginTop: 0 }}>{r.name} <span style={{ color: MOOD_COL[r.mood] }}>{r.score}</span></h2>
                  <table className="table"><tbody>
                    {r.components.map((c) => (
                      <tr key={c.key}><td>{c.label}<div className="dim" style={{ fontSize: 12 }}>{c.read}</div></td><td className="mono">{c.value}</td><td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{c.score}</td></tr>
                    ))}
                  </tbody></table>
                  {r.phase.length > 0 && <p className="muted" style={{ fontSize: 13 }}>Cycle (Wyckoff): {r.phase.map((p) => `${p.index} ${p.phase}`).join(' · ')}</p>}
                </section>
              ))}
            </div>
            <section className="card" aria-label="Money movement">
              <h2>Money movement</h2>
              <div className="grid">
                <div>
                  <h3>Do markets move together? (60 days)</h3>
                  <table className="table"><tbody>{s.flows.corr60.map((c) => <tr key={c.pair}><td>{c.pair}</td><td className="mono" style={{ textAlign: 'right' }}>{c.value.toFixed(2)}</td></tr>)}</tbody></table>
                  <p className="dim" style={{ fontSize: 12 }}>1 = always move together, 0 = unrelated, −1 = opposite.</p>
                </div>
                <div>
                  <h3>Where money went (3 months)</h3>
                  <table className="table"><tbody>{s.flows.relative.map((x) => <tr key={x.label}><td>{x.label}<div className="dim" style={{ fontSize: 12 }}>{x.read}</div></td><td className="mono" style={{ textAlign: 'right' }}>{x.pct >= 0 ? '+' : '−'}{Math.abs(x.pct).toFixed(1)} pts</td></tr>)}</tbody></table>
                </div>
              </div>
            </section>
            <section className="card">
              <h2>How to use it</h2>
              <ul>
                <li><b>Extreme fear (under 25)</b> has often come near market lows, and extreme greed (over 75) near tops. Either can last for weeks.</li>
                <li>Use it to check your own behaviour: fear is when people sell good long-term investments at bad prices; greed is when they buy what has already run up.</li>
                <li>Your plan beats the mood: keep your emergency fund in cash and keep investing on schedule.</li>
              </ul>
            </section>
          </>
        )}
      </main>
      <Footer note="SIXXAB Sentiment is built from public prices, volatility and breadth (Yahoo Finance, delayed). It describes investor mood and is not a forecast or a recommendation." />
    </>
  );
}
