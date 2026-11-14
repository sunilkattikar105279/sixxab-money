import Link from 'next/link';
import { Header, Footer } from '@/components/Header';
import { IndustryMap } from '@/components/IndustryMap';
import { getStocks, heatColor } from '@/lib/data/stocks';
import { worldTiles, FX, CURVE, fredSeries } from '@/lib/data/world';
import type { Market } from '@/lib/data/market';

export const revalidate = 300;

const VIEWS = [['sectors', 'Sector maps'], ['world', 'World markets'], ['fx', 'Currencies'], ['rates', 'Interest rates']] as const;
const pct = (p: number | null) => (p === null ? '—' : `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(p).toFixed(2)}%`);

export default async function Maps({ searchParams }: { searchParams: Promise<{ view?: string; m?: string }> }) {
  const { view: v, m } = await searchParams;
  const view = VIEWS.some(([k]) => k === v) ? v! : 'sectors';
  const market: Market = m === 'IN' || m === 'GLOBAL' ? m : 'US';

  return (
    <>
      <Header active="Maps" />
      <main className="wrap">
        <nav className="seg" aria-label="Map view" style={{ alignSelf: 'flex-start', flexWrap: 'wrap' }}>
          {VIEWS.map(([k, label]) => <Link key={k} href={`/maps?view=${k}`} aria-current={k === view ? 'true' : undefined} style={{ padding: '0 16px' }}>{label}</Link>)}
        </nav>
        {view === 'sectors' && <Sectors market={market} />}
        {view === 'world' && <World />}
        {view === 'fx' && <Currencies />}
        {view === 'rates' && <Rates />}
        <Footer note="Maps refresh every 5 minutes · education, not investment advice" />
      </main>
    </>
  );
}

async function Sectors({ market }: { market: Market }) {
  const board = await getStocks(market);
  return (
    <>
      <nav className="seg" aria-label="Market" style={{ alignSelf: 'flex-start' }}>
        {(['US', 'IN', 'GLOBAL'] as const).map((k) => <Link key={k} href={`/maps?view=sectors&m=${k}`} aria-current={k === market ? 'true' : undefined}>{k === 'IN' ? 'India' : k === 'GLOBAL' ? 'Global' : 'US'}</Link>)}
      </nav>
      <IndustryMap board={board} title={`${market === 'IN' ? 'India (NSE)' : market === 'GLOBAL' ? 'Global leaders' : 'US'} sector map`} />
    </>
  );
}

async function World() {
  const { tiles, asOf, source } = await worldTiles();
  const cols = 11, rows = 4;
  return (
    <section className="card" aria-label="World markets">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 12 }}><h2>World markets today</h2><span className="dim" style={{ fontSize: 12 }}>{asOf ?? 'awaiting data'}</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, 76px)`, gap: 6, overflowX: 'auto', minWidth: 0 }}>
        {tiles.map((t) => (
          <div key={t.code} title={`${t.name} (${t.etf}): ${pct(t.changePct)}`} style={{ gridColumn: t.col + 1, gridRow: t.row + 1, background: heatColor(t.changePct), borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', textAlign: 'center', minWidth: 64 }}>
            <span style={{ font: '700 14px var(--head)' }}>{t.code}</span>
            <span style={{ font: '600 12px var(--mono)' }}>{pct(t.changePct)}</span>
          </div>
        ))}
      </div>
      <p className="dim" style={{ margin: '10px 0 0', fontSize: 12 }}>Each tile is the country’s main US-listed ETF (e.g. India = INDA, Japan = EWJ), so moves include currency changes vs the dollar · {source}</p>
    </section>
  );
}

async function Currencies() {
  const rows = await Promise.all(FX.map(async (f) => ({ ...f, d: await fredSeries(f.series) })));
  return (
    <section className="grid" aria-label="Currencies">
      {rows.map((r) => {
        const ch = r.d && r.d.prev ? ((r.d.value - r.d.prev) / r.d.prev) * 100 : null;
        return (
          <article key={r.key} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="tag dim">FRED {r.series}{r.d ? ` · ${r.d.date}` : ''}</div>
            <h2>{r.label}</h2>
            <div className="big">{r.d ? r.d.value.toLocaleString('en-US', { maximumFractionDigits: 4 }) : '—'}</div>
            <div className={`mono ${ch === null ? 'dim' : ch >= 0 ? 'green' : 'red'}`}>{pct(ch)}</div>
            {r.key === 'usd_inr' && <p className="muted" style={{ margin: 0, fontSize: 13 }}>Higher means a weaker rupee: costlier fuel, gadgets and US tuition, better for exporters.</p>}
          </article>
        );
      })}
    </section>
  );
}

async function Rates() {
  const pts = await Promise.all(CURVE.map(async (c) => ({ ...c, d: await fredSeries(c.series) })));
  const have = pts.filter((p) => p.d);
  const W = 720, H = 260, L = 48, R = 20, T = 20, B = 40;
  const xs = (i: number) => L + (i / (CURVE.length - 1)) * (W - L - R);
  const vals = have.map((p) => p.d!.value), lo = Math.min(...vals, 0), hi = Math.max(...vals, 1);
  const ys = (v: number) => T + (1 - (v - lo) / (hi - lo || 1)) * (H - T - B);
  const inverted = (() => { const two = pts.find((p) => p.label === '2Y')?.d?.value, ten = pts.find((p) => p.label === '10Y')?.d?.value; return two !== undefined && ten !== undefined ? ten < two : null; })();
  return (
    <section className="card" aria-label="US Treasury yield curve">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}><h2>US Treasury yield curve</h2><span className="dim" style={{ fontSize: 12 }}>{have[0]?.d?.date ?? 'add a FRED key'}</span></div>
      {have.length >= 2 ? (
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Yield by maturity" style={{ width: '100%', height: 'auto', marginTop: 8 }}>
          <polyline fill="none" stroke="#4FD1B8" strokeWidth="3" points={pts.map((p, i) => (p.d ? `${xs(i)},${ys(p.d.value)}` : '')).filter(Boolean).join(' ')} />
          {pts.map((p, i) => (
            <g key={p.label}>
              <text x={xs(i)} y={H - 14} fill="#A9B8CC" fontSize="12" textAnchor="middle">{p.label}</text>
              {p.d && <><circle cx={xs(i)} cy={ys(p.d.value)} r="4" fill="#D4A84B" /><text x={xs(i)} y={ys(p.d.value) - 10} fill="#E6EDF6" fontSize="12" textAnchor="middle">{p.d.value.toFixed(2)}%</text></>}
            </g>
          ))}
        </svg>
      ) : <p className="muted">Add FRED_API_KEY to draw the curve.</p>}
      {inverted !== null && <p style={{ margin: '8px 0 0' }}>{inverted ? <b className="red">Inverted: </b> : <b className="green">Normal: </b>}{inverted ? 'the 10-year pays less than the 2-year, which has often come before slowdowns.' : 'longer loans pay more than shorter ones, the usual shape.'}</p>}
      <p className="dim" style={{ margin: '6px 0 0', fontSize: 12 }}>Source: FRED (US Treasury constant-maturity yields) · Mortgage rates track the 10-year</p>
    </section>
  );
}
