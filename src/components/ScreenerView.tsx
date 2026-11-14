'use client';
import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';

type Mode = 'invest' | 'day' | 'quick';
interface Factor { key: string; label: string; score: number; why: string }
interface Setup { side: 'long' | 'short' | 'avoid'; entry?: number; stop?: number; target?: number; rr?: number; with_trend?: boolean; withTrend?: boolean; timeframe: string; reasons: string[]; levelsHidden?: boolean }
interface Row { symbol: string; name: string; sector: string; composite: number; bias: string; factors: Factor[]; trends: Record<string, string | null>; setup: Setup | null }
interface Resp { asOf: string | null; live: boolean; allowLevels: boolean; rows: Row[]; note?: string }

const MODES: [Mode, string, string][] = [
  ['invest', 'Investment & swing', 'Yearly, monthly, weekly trend · weekly/daily breaks · daily demand zones · Wyckoff cycle'],
  ['day', 'Day trades', 'Daily bias · 4H and 1H trend · 1H/4H zones · 15m confirmation'],
  ['quick', 'Quick trades', 'Volume surge on 15m/5m · VWAP side · 1m break'],
];
const TFS: [string, string][] = [['y', 'Y'], ['M', 'M'], ['w', 'W'], ['d', 'D'], ['h4', '4H'], ['h1', '1H'], ['m15', '15m']];

function TrendChip({ v }: { v: string | null }) {
  if (!v) return <span className="chip flat">·</span>;
  return <span className={`chip ${v === 'UP' ? 'up' : v === 'DOWN' ? 'down' : 'flat'}`}>{v === 'UP' ? '▲' : v === 'DOWN' ? '▼' : '■'}</span>;
}

function ScoreBar({ v }: { v: number }) {
  const col = v >= 7 ? 'var(--green)' : v <= 4 ? 'var(--red)' : 'var(--gold)';
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 54, height: 6, background: 'var(--line)', borderRadius: 3, overflow: 'hidden' }}><span style={{ display: 'block', width: `${v * 10}%`, height: 6, background: col }} /></span><b className="mono" style={{ color: col }}>{v.toFixed(1)}</b></span>;
}

export function ScreenerView() {
  const [market, setMarket] = useState<'US' | 'IN' | 'GLOBAL'>('US');
  const [mode, setMode] = useState<Mode>('invest');
  const [data, setData] = useState<Resp | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [onlySetups, setOnlySetups] = useState(false);

  useEffect(() => {
    let off = false; setBusy(true); setData(null);
    fetch(`/api/screener?market=${market}&mode=${mode}`, { signal: AbortSignal.timeout(60_000) }).then((r) => r.json()).then((j) => { if (!off) setData(j); })
      .catch(() => { if (!off) setData({ asOf: null, live: true, allowLevels: true, rows: [], note: 'The scan took too long. Try again, or run the nightly scan script to save results.' }); })
      .finally(() => !off && setBusy(false));
    return () => { off = true; };
  }, [market, mode]);

  const rows = (data?.rows ?? []).filter((r) => !onlySetups || r.setup);
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <nav className="seg" aria-label="Market">{(['US', 'IN', 'GLOBAL'] as const).map((m) => <button key={m} type="button" onClick={() => setMarket(m)} aria-current={market === m ? 'true' : undefined} style={{ minHeight: 38, minWidth: 76, border: 0, borderRadius: 8, cursor: 'pointer', font: '600 13px Inter', background: market === m ? 'var(--teal)' : 'transparent', color: market === m ? '#0B1B33' : 'var(--muted)' }}>{m === 'IN' ? 'India' : m === 'GLOBAL' ? 'Global' : 'US'}</button>)}</nav>
        <nav className="seg" aria-label="Mode">{MODES.map(([m, label]) => <button key={m} type="button" onClick={() => setMode(m)} aria-current={mode === m ? 'true' : undefined} style={{ minHeight: 38, padding: '0 14px', border: 0, borderRadius: 8, cursor: 'pointer', font: '600 13px Inter', background: mode === m ? 'var(--gold)' : 'transparent', color: mode === m ? '#0B1B33' : 'var(--muted)' }}>{label}</button>)}</nav>
        <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 13 }}><input type="checkbox" checked={onlySetups} onChange={(e) => setOnlySetups(e.target.checked)} style={{ width: 18, minHeight: 18 }} /> Setups only</label>
      </div>
      <p className="dim" style={{ margin: 0, fontSize: 12 }}>{MODES.find((m) => m[0] === mode)![2]} · Reward:risk 1:2 with the higher-timeframe trend, 1:1 against it</p>

      <section className="card scroll">
        {busy && <p className="muted" style={{ margin: 0 }}>Scanning…</p>}
        {data?.note && <p className="muted" style={{ margin: 0 }}>{data.note}</p>}
        {!busy && data && !data.allowLevels && <p className="gold" style={{ margin: '0 0 8px', fontSize: 13 }}>India: scores and technical reads only. Entry, stop and target levels appear after SEBI research-analyst registration.</p>}
        {!busy && rows.length > 0 && (
          <table className="compact">
            <thead><tr><th>Ticker</th><th>Score</th>{TFS.map(([, l]) => <th key={l} style={{ textAlign: 'center' }}>{l}</th>)}<th>Setup</th><th style={{ textAlign: 'right' }}>Entry</th><th style={{ textAlign: 'right' }}>Stop</th><th style={{ textAlign: 'right' }}>Target</th><th>R:R</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <Fragment key={r.symbol}>
                  <tr onClick={() => setOpen(open === r.symbol ? null : r.symbol)} style={{ cursor: 'pointer' }}>
                    <td><Link href={`/stock/${market}/${encodeURIComponent(r.symbol)}`} className="mono" style={{ fontWeight: 700 }} onClick={(e) => e.stopPropagation()}>{r.symbol}</Link><div className="dim" style={{ fontSize: 11 }}>{r.sector}</div></td>
                    <td><ScoreBar v={r.composite} /></td>
                    {TFS.map(([k]) => <td key={k} style={{ textAlign: 'center' }}><TrendChip v={r.trends?.[k] ?? null} /></td>)}
                    <td>{r.setup ? <span className={`chip ${r.setup.side === 'long' ? 'up' : r.setup.side === 'short' ? 'down' : 'flat'}`}>{r.setup.side === 'avoid' ? 'AVOID' : `${r.setup.side.toUpperCase()} · ${r.setup.timeframe}`}</span> : <span className="dim">—</span>}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>{r.setup?.entry ?? '—'}</td>
                    <td className="mono red" style={{ textAlign: 'right' }}>{r.setup?.stop ?? '—'}</td>
                    <td className="mono green" style={{ textAlign: 'right' }}>{r.setup?.target ?? '—'}</td>
                    <td className="mono">{r.setup?.rr ? `1:${r.setup.rr}` : '—'}</td>
                  </tr>
                  {open === r.symbol && (
                    <tr><td colSpan={13} style={{ background: 'var(--panel2)' }}>
                      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                        {r.factors.map((f) => <div key={f.key}><div className="tag dim">{f.label}</div><ScoreBar v={f.score} /><div className="muted" style={{ fontSize: 12 }}>{f.why}</div></div>)}
                      </div>
                      {r.setup && <p style={{ margin: '8px 0 0', fontSize: 13 }}><b>Why this setup:</b> {r.setup.reasons.join(' · ')}</p>}
                    </td></tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <p className="dim" style={{ margin: 0, fontSize: 12 }}>{data?.asOf ? `${data.live ? 'Live scan' : 'Nightly scan'} · ${data.asOf.slice(0, 16).replace('T', ' ')}` : ''} · Educational scenarios built from rules, not a recommendation to buy or sell. Levels can fail.</p>
    </>
  );
}
