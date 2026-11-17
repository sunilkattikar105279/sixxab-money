import WaveChart from '@/components/WaveChart';
import { RiskMeter } from '@/components/RiskMeter';
import { getRegime } from '@/lib/data/regime';
import { signedIn } from '@/lib/viewer';
import { JoinPrompt } from '@/components/JoinPrompt';
import { notFound } from 'next/navigation';
import { Header, Footer } from '@/components/Header';
import { adminClient } from '@/lib/supabase/admin';
import type { TechReport } from '@/lib/ta/analyze';
import type { FactorScore } from '@/lib/score';
import { levelsAllowed } from '@/lib/compliance';

export const dynamic = 'force-dynamic';

const cls = (v: string | null) => (v === 'UP' ? 'chip up' : v === 'DOWN' ? 'chip down' : 'chip flat');
const n = (x: number | null | undefined) => (x === null || x === undefined ? '—' : x.toLocaleString('en-US', { maximumFractionDigits: 2 }));

export default async function Stock({ params }: { params: Promise<{ market: string; symbol: string }> }) {
  const { market, symbol } = await params;
  if (!['US', 'IN', 'GLOBAL'].includes(market)) notFound();
  const sym = decodeURIComponent(symbol);
  const db = adminClient();
  const row = db ? (await db.from('stock_analysis').select('*').eq('market', market).eq('symbol', sym).order('as_of', { ascending: false }).limit(1).maybeSingle()).data : null;
  if (!row) {
    return (<><Header active="Screener" /><main className="wrap" id="main"><section className="card"><h1 style={{ fontSize: 24 }}>{sym}</h1><p className="muted">No analysis yet. It appears after the nightly scan runs with this market’s data key.</p></section></main></>);
  }
  const t = row.tech as TechReport; const factors = row.factors as FactorScore[];
  const showLevels = levelsAllowed(market as 'US' | 'IN' | 'GLOBAL');
  const member = await signedIn();
  const detail = showLevels && member; // member-only: wave targets, invalidation, zones, watch levels
  const here = `/stock/${market}/${encodeURIComponent(sym)}`;
  return (
    <>
      <Header active="Screener" />
      <main className="wrap" id="main">
        <section className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
          <div style={{ flex: '1 1 300px' }}><div className="tag dim">{row.sector} · {market} · {row.as_of}</div><h1 style={{ fontSize: 30 }}>{row.symbol} <span className="muted" style={{ fontSize: 18 }}>{row.name}</span></h1><div className="big">{n(t.price)} <span className={t.changePct !== null && t.changePct >= 0 ? 'green' : 'red'} style={{ fontSize: 18 }}>{t.changePct !== null ? `${t.changePct >= 0 ? '+' : ''}${t.changePct.toFixed(2)}%` : ''}</span></div></div>
          <div style={{ textAlign: 'center' }}><div className="tag dim">SIXXAB score</div><div style={{ font: '700 48px var(--head)', color: row.composite >= 7 ? 'var(--green)' : row.composite <= 4 ? 'var(--red)' : 'var(--gold)' }}>{Number(row.composite).toFixed(1)}</div><div className="muted">{row.bias}</div></div>
        </section>
        <section className="grid">{factors.map((f) => <div key={f.key} className="card"><div className="tag dim">{f.label}</div><div style={{ font: '700 24px var(--head)', color: '#fff' }}>{f.score.toFixed(1)}</div><div className="muted" style={{ fontSize: 13 }}>{f.why}</div></div>)}</section>
        <div className="cols">
          <div className="main">
            <section className="card scroll"><h2 style={{ marginBottom: 8 }}>Trend by timeframe</h2>
              <table className="compact"><thead><tr>{['Yearly', 'Monthly', 'Weekly', 'Daily', '4H', '1H'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
                <tbody><tr>{[t.trends.y, t.trends.M, t.trends.w, t.trends.d, t.trends.h4, t.trends.h1].map((v, i) => <td key={i}><span className={cls(v)}>{v ?? '—'}</span></td>)}</tr></tbody></table>
            </section>
            <section className="card scroll"><h2 style={{ marginBottom: 8 }}>Break levels</h2>
              <table className="compact"><thead><tr><th>Timeframe</th><th style={{ textAlign: 'right' }}>Break up</th><th style={{ textAlign: 'right' }}>Break down</th><th>Latest</th></tr></thead>
                <tbody>{([['Monthly', t.breaks.M], ['Weekly', t.breaks.w], ['Daily', t.breaks.d]] as const).map(([l, b]) => <tr key={l}><td>{l}</td><td className="mono green" style={{ textAlign: 'right' }}>{showLevels ? n(b.up) : '·'}</td><td className="mono red" style={{ textAlign: 'right' }}>{showLevels ? n(b.down) : '·'}</td><td>{b.brokeUp ? <span className="chip up">broke up</span> : b.brokeDown ? <span className="chip down">broke down</span> : <span className="dim">inside</span>}</td></tr>)}</tbody></table>
            </section>
            <section className="card scroll"><h2 style={{ marginBottom: 8 }}>Supply and demand zones</h2>
              {member ? <table className="compact"><thead><tr><th>Timeframe</th><th>Type</th><th style={{ textAlign: 'right' }}>Low</th><th style={{ textAlign: 'right' }}>High</th><th>Fresh</th></tr></thead>
                <tbody>{([['Daily', t.zones.d], ['4H', t.zones.h4], ['1H', t.zones.h1]] as const).flatMap(([l, zs]) => zs.map((z, i) => <tr key={l + i}><td>{l}</td><td><span className={`chip ${z.kind === 'demand' ? 'up' : 'down'}`}>{z.kind}</span></td><td className="mono" style={{ textAlign: 'right' }}>{showLevels ? n(z.low) : '·'}</td><td className="mono" style={{ textAlign: 'right' }}>{showLevels ? n(z.high) : '·'}</td><td>{z.fresh ? 'yes' : 'tested'}</td></tr>))}</tbody></table> : <JoinPrompt what="Where buyers and sellers stepped in on daily, 4-hour and 1-hour charts" from={here} />}
              {!showLevels && <p className="gold" style={{ fontSize: 12 }}>Levels hidden for India until SEBI research-analyst registration.</p>}
            </section>
          </div>
          <aside className="side">
            <section className="card" style={{ borderColor: 'var(--gold)' }}><h2 style={{ marginBottom: 8 }}>What to watch</h2>
              {(market === 'US' || market === 'IN') && <div style={{ marginBottom: 6 }}><RiskMeter r={await getRegime(market)} compact /></div>}
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
                <li>Trend: weekly {t.trends.w}, daily {t.trends.d}{t.trends.w !== t.trends.d ? ' (timeframes disagree: wait for them to line up)' : ''}</li>
                {detail && t.breaks.d.up != null && <li>A daily close above <b className="green">{n(t.breaks.d.up)}</b> would confirm strength</li>}
                {detail && t.breaks.d.down != null && <li>A daily close below <b className="red">{n(t.breaks.d.down)}</b> would confirm weakness</li>}
                {t.waves.wave && <li>Elliott: {t.waves.degree ?? 'daily'} wave {t.waves.wave}{detail && t.waves.invalidation != null ? `; count fails beyond ${n(t.waves.invalidation)}` : ''}</li>}
                <li>Volume: {t.volume.rvolD.toFixed(1)}x average, money flow {t.volume.cmf20 >= 0 ? 'positive' : 'negative'}</li>
              </ul>
              {showLevels && !member && <div style={{ marginTop: 8 }}><JoinPrompt what="The exact levels that confirm or cancel this read" from={here} /></div>}
              <p className="dim" style={{ margin: '6px 0 0', fontSize: 12 }}>Scenarios for learning, not a recommendation.</p>
            </section>
            <section className="card"><h2 style={{ marginBottom: 8 }}>Market cycle (Wyckoff read)</h2>
              <p style={{ margin: 0 }}><b>Weekly:</b> {t.cycle.weekly.phase} <span className="dim">({t.cycle.weekly.confidence})</span></p>
              <p style={{ margin: '4px 0' }}><b>Daily:</b> {t.cycle.daily.phase} <span className="dim">({t.cycle.daily.confidence})</span></p>
              <ul className="muted" style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>{[...t.cycle.weekly.notes, ...t.cycle.daily.notes].map((x, i) => <li key={i}>{x}</li>)}</ul>
            </section>
            <section className="card"><h2 style={{ marginBottom: 8 }}>Elliott wave read</h2>
              {t.waves.summary ? <p style={{ margin: 0 }}>{detail ? t.waves.summary : t.waves.summary.replace(/\d[\d,.]*/g, '·').replace(/wave ·/g, `wave ${t.waves.wave ?? ''}`)}</p>
                : <p style={{ margin: 0 }}>{t.waves.pattern === 'none' ? 'No clear count' : `${t.waves.pattern}${t.waves.wave ? `, wave ${t.waves.wave}` : ''}`}</p>}
              <p className="dim" style={{ margin: '4px 0 0', fontSize: 13 }}>{t.waves.confidence} confidence{t.waves.score != null ? ` · fit ${t.waves.score}/100` : ''}{t.waves.degree ? ` · ${t.waves.degree}` : ''}</p>
              {t.waves.points && t.waves.points.length > 2 && <WaveChart points={t.waves.points} invalidation={detail ? t.waves.invalidation : null} showPrices={detail} />}
              {detail && t.waves.targets && t.waves.targets.length > 0 && <table className="compact"><tbody>{t.waves.targets.map((x) => <tr key={x.label}><td className="muted">{x.label}</td><td className="mono" style={{ textAlign: 'right' }}>{n(x.price)}</td></tr>)}{t.waves.invalidation != null && <tr><td className="muted">count fails beyond</td><td className="mono red" style={{ textAlign: 'right' }}>{n(t.waves.invalidation)}</td></tr>}</tbody></table>}
              {showLevels && !member && t.waves.targets && t.waves.targets.length > 0 && <JoinPrompt what="Wave targets, the price where the count fails, and an alternate count" from={here} />}
              <ul className="muted" style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 13 }}>{t.waves.notes.map((x, i) => <li key={i}>{x}</li>)}</ul>
              {t.waves.alternate && detail && <p className="dim" style={{ margin: '6px 0 0', fontSize: 12 }}>Alternate: {t.waves.alternate.summary}</p>}
            </section>
            <section className="card"><h2 style={{ marginBottom: 8 }}>Volume</h2>
              <p style={{ margin: 0 }}>Money flow (20d): <b className={t.volume.cmf20 >= 0 ? 'green' : 'red'}>{t.volume.cmf20.toFixed(2)}</b></p>
              <p style={{ margin: '4px 0 0' }}>Today vs average: <b>{t.volume.rvolD.toFixed(1)}x</b></p>
              <p style={{ margin: '4px 0 0' }}>A/D line: <b className={t.volume.adSlope >= 0 ? 'green' : 'red'}>{t.volume.adSlope >= 0 ? 'rising (accumulation)' : 'falling (distribution)'}</b></p>
            </section>
          </aside>
        </div>
        <Footer note={`Source: ${row.source} · Pattern reads are rule-based and can be wrong · Educational, not a recommendation`} />
      </main>
    </>
  );
}
