import type { Metadata } from 'next';
import Link from 'next/link';
import { Header, Footer } from '@/components/Header';
import { WorldMap, ShareChart, EmpireTimeline } from '@/components/EpochVisuals';
import { EMPIRES, AVG_REIGN, MONEY_FORMS, CYCLE, FUTURE, ROADMAP, FACTORS, LEGACY_RULES, EPOCH_SOURCES, GDP_SHARE } from '@/lib/epoch';

export const metadata: Metadata = { title: 'Epoch · The money story of the last 500 years', description: 'How empires made money, lost it and handed it on, 1500 to today, and what the data says about the next 200 years. By Epoch, the SIXXAB Money history agent.' };

function Gdp2075() {
  const max = Math.max(...FUTURE.gdp2075.map((g) => g.usdTn));
  return (
    <svg viewBox="0 0 600 190" width="100%" role="img" aria-label={`Projected GDP in 2075: ${FUTURE.gdp2075.map((g) => `${g.name} $${g.usdTn} trillion`).join(', ')}`}>
      {FUTURE.gdp2075.map((g, i) => {
        const y = 10 + i * 35, w = (g.usdTn / max) * 380;
        return (
          <g key={g.name}>
            <text x={130} y={y + 19} textAnchor="end" fontSize={13} fill="#fff">{g.name}</text>
            <rect x={140} y={y} width={w} height={26} rx={5} fill={['#FF5C7A', '#F59E5B', '#5B8DEF', '#2EC4B6', '#7ED957'][i]} fillOpacity={0.85} />
            <text x={146 + w} y={y + 19} fontSize={13} fontWeight={700} fill="#fff">${g.usdTn}tn</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function History() {
  const now = new Date().getUTCFullYear();
  const usYears = now - 1920;
  const asia = (y: number) => { const r = GDP_SHARE.find((x) => x.year === y)!; return Math.round(r.china + r.india + r.japan); };
  return (
    <>
      <Header active="History" />
      <main className="wrap" id="main">
        <section className="bar">
          <span className="tag gold">Epoch · The money story</span>
          <span style={{ flex: '1 1 480px' }}>Epoch is the SIXXAB Money history agent. It tracks 500 years of empires, money and cycles: how wealth is created, how leaders rise and fall, the mistakes that repeat, and what the data says about the next 200 years. Education, not a forecast you can trade on.</span>
        </section>

        <section className="card" aria-label="The world economy over time">
          <h1 style={{ fontSize: 28, margin: '0 0 4px' }}>Who made the world’s money, 1500 to 2030</h1>
          <p className="muted" style={{ marginTop: 0 }}>Each bubble is a region’s share of world output. Pick a year. In 1500, China and India made about half of everything; by 1950 the US and Western Europe made more than half; by 2030 Asia is projected to be back near where it was in 1820.</p>
          <WorldMap />
        </section>

        <section className="card" aria-label="Share of world output">
          <h2>500 years in one chart</h2>
          <ShareChart />
          <div className="grid" style={{ marginTop: 10 }}>
            <div className="inset"><b>The great divergence.</b> Asia (China, India, Japan) produced about {asia(1820)}% of world output in 1820 and only {asia(1973)}% in 1973. Industry, colonial rule and closed economies did that.</div>
            <div className="inset"><b>The great return.</b> Open trade, education and technology lifted Asia back to {asia(2003)}% by 2003, with about {asia(2030)}% projected for 2030.</div>
            <div className="inset"><b>India’s arc.</b> About a quarter of world output from 1500 to 1700, 4% in 1950, and rising again: the biggest comeback story still being written.</div>
          </div>
        </section>

        <section className="card" aria-label="Empires and reserve currencies">
          <h2>Six empires, six world currencies</h2>
          <p className="muted" style={{ marginTop: 0 }}>The world’s main trading currency has changed hands five times since 1450. The average reign of the five that ended was {AVG_REIGN} years. The dollar has led for about {usYears}.</p>
          <EmpireTimeline now={now} />
          <div className="grid" style={{ marginTop: 12 }}>
            {EMPIRES.map((e) => (
              <article key={e.name} className="inset" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div><b style={{ fontSize: 17 }}>{e.name}</b> <span className="dim" style={{ fontSize: 12 }}>{e.currency} · {e.from}–{e.to ?? 'today'}</span></div>
                <div style={{ fontSize: 13 }}><b className="green">Rose:</b> {e.rose}</div>
                <div style={{ fontSize: 13 }}><b className="gold">New money:</b> {e.money}</div>
                <div style={{ fontSize: 13 }}><b style={{ color: '#FF5C7A' }}>Mistake:</b> {e.mistake}</div>
                <div style={{ fontSize: 13 }}><b style={{ color: '#2EC4B6' }}>Lesson:</b> {e.lesson}</div>
              </article>
            ))}
          </div>
        </section>

        <section className="card" aria-label="The big cycle">
          <h2>The cycle every empire goes through</h2>
          <p className="muted" style={{ marginTop: 0 }}>Historians and investors such as Ray Dalio describe the same arc again and again. It is a pattern, not a law: the timing differs every time.</p>
          <ol className="cycle-row">{CYCLE.map((c) => <li key={c.stage} className="inset"><b>{c.stage}</b><div className="dim" style={{ fontSize: 13 }}>{c.signs}</div></li>)}</ol>
        </section>

        <section className="card" aria-label="How money changed">
          <h2>How money itself changed: metal, then trust, then code</h2>
          <ol className="money-forms">{MONEY_FORMS.map((m) => <li key={m.year}><span className="mono gold">{m.year}</span> <b>{m.label}</b> <span className="dim">· {m.note}</span></li>)}</ol>
          <p className="muted">One more long trend: real interest rates have fallen by about {FUTURE.realRateTrendBpPerYear} basis points a year on average since the 1300s, across empires. Money has steadily become cheaper to borrow over the centuries, with sharp reversals along the way.</p>
        </section>

        <section className="card" aria-label="What the data says about the future">
          <h2>What the data says about the next 200 years</h2>
          <div className="grid">
            <div>
              <h3 style={{ marginTop: 0 }}>Projected size of the largest economies in 2075</h3>
              <Gdp2075 />
              <p className="dim" style={{ fontSize: 12 }}>Real US dollars, Goldman Sachs Research. Per person, Americans are still projected to be more than twice as rich as Chinese or Indians.</p>
            </div>
            <div>
              <h3 style={{ marginTop: 0 }}>The signals Epoch watches</h3>
              <table className="table"><tbody>
                <tr><td>Dollar’s reign vs the historical average</td><td className="mono">{usYears} vs {AVG_REIGN} yrs</td></tr>
                <tr><td>World population now → peak</td><td className="mono">{FUTURE.population.now}bn → {FUTURE.population.peak}bn ({FUTURE.population.peakWhen})</td></tr>
                <tr><td>China’s population in 2100 (projected)</td><td className="mono">{FUTURE.population.china2100}m</td></tr>
                <tr><td>Asia’s share of world output, 1973 → 2030</td><td className="mono">{asia(1973)}% → {asia(2030)}%</td></tr>
                <tr><td>Long-run real-rate trend</td><td className="mono">−{FUTURE.realRateTrendBpPerYear} bp a year</td></tr>
              </tbody></table>
              <p className="dim" style={{ fontSize: 12 }}>A long reign is not proof of an ending: transitions have taken decades and needed a rival with deeper markets and trusted institutions.</p>
            </div>
          </div>
          <div className="roadmap">
            {ROADMAP.map((r) => (
              <article key={r.window} className="inset">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><b style={{ fontSize: 18 }}>{r.window}</b><span className={`tag ${r.confidence === 'data-led' ? 'teal' : r.confidence === 'trend-led' ? 'gold' : 'dim'}`}>{r.confidence}</span></div>
                <p style={{ fontSize: 14, margin: '6px 0' }}><b>The world:</b> {r.world}</p>
                <p style={{ fontSize: 14, margin: '6px 0' }}><b>Money:</b> {r.money}</p>
                <p style={{ fontSize: 14, margin: '6px 0' }}><b>Your legacy:</b> {r.legacy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="card" aria-label="Forces that move money">
          <h2>The eight forces that move money</h2>
          <div className="grid">{FACTORS.map((f) => <div key={f.name} className="inset"><b>{f.name}</b><div className="dim" style={{ fontSize: 13 }}>{f.why}</div></div>)}</div>
        </section>

        <section className="card promo-gold" aria-label="Build a legacy">
          <h2>How to build a legacy from 500 years of lessons</h2>
          <ol>{LEGACY_RULES.map((l) => <li key={l} style={{ margin: '6px 0' }}>{l}</li>)}</ol>
          <p className="muted">Next: see today’s market mood with <Link href="/sentiment">Pulse</Link>, or plan your stage with <Link href="/ask">Mentor</Link>.</p>
        </section>

        <section className="card" aria-label="Sources">
          <h2>Sources</h2>
          <ul style={{ fontSize: 13 }}>{EPOCH_SOURCES.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a></li>)}</ul>
          <p className="dim" style={{ fontSize: 12 }}>Output shares before 1820 are rough scholarly estimates (Maddison, purchasing-power basis). 2030 and 2075 figures are projections; 2100–2226 is a scenario, not a forecast.</p>
        </section>
        <Footer note="Epoch tells the history of money for education. Projections are not promises; past returns do not guarantee future results." />
      </main>
    </>
  );
}
