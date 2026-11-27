import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMember } from '@/lib/member';
import { adminClient } from '@/lib/supabase/admin';
import { goLiveCheck, DEFAULT_LIMITS } from '@/lib/risk';
import { maxDrawdownPct } from '@/lib/autotrade';
import { Sparkline } from '@/components/Sparkline';
import btUS from '@/data/backtest-US.json';
import btIN from '@/data/backtest-IN.json';

export const metadata: Metadata = { title: 'Live trading (owner)', robots: { index: false } };
export const dynamic = 'force-dynamic';

interface Run { broker: string; market: string; run_at: string; run_on: string; paper: boolean; equity: number | null; orders_placed: number; broker_errors: number; reconcile_mismatches: number; blocked: { symbol: string; reasons: string[] }[]; log: string[] }
interface LT { id: number; broker: string; market: string; symbol: string; status: string; qty: number; entry: number; stop: number; target: number; fill_price: number | null; exit_price: number | null; exit_reason: string | null; pnl: number | null; setup_score: number | null; created_on: string; closed_on: string | null }
interface Variant { name: string; from: string; to: string; totalReturnPct: number; cagrPct: number; maxDrawdownPct: number; benchReturnPct: number; benchCagrPct: number; benchMaxDrawdownPct: number; exposurePct: number; costs: number; stats: { closed: number; winRate: number; profitFactor: number | null }; equity: { d: string; equity: number; bench: number }[] }
interface BT { market: string; generated: string | null; currency: string; startCash: number; benchmark: string; note: string; variants: Variant[] }

const BROKERS = [
  { key: 'alpaca-paper', label: 'US · Alpaca paper', market: 'US' }, { key: 'alpaca', label: 'US · Alpaca REAL MONEY', market: 'US' },
  { key: 'kite-paper', label: 'India · Kite paper (simulated)', market: 'IN' }, { key: 'kite', label: 'India · Kite REAL MONEY', market: 'IN' },
] as const;

export default async function Live({ searchParams }: { searchParams: Promise<{ kite?: string }> }) {
  const m = await getMember();
  if (m?.member?.role !== 'admin') notFound();
  const { kite } = await searchParams;
  const db = adminClient();
  const [{ data: runs }, { data: trades }, { data: tok }] = db ? await Promise.all([
    db.from('live_runs').select('*').order('run_at', { ascending: false }).limit(400),
    db.from('live_trades').select('*').order('created_on', { ascending: false }).limit(300),
    db.from('broker_tokens').select('created_at').eq('broker', 'kite').maybeSingle(),
  ]) : [{ data: null }, { data: null }, { data: null }];
  const R = (runs ?? []) as Run[], T = (trades ?? []) as LT[];
  const kiteToday = tok && new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(tok.created_at)) === new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const on = process.env.SIXXAB_LIVE_TRADING === 'true', kill = process.env.SIXXAB_KILL_SWITCH === 'true';
  const usReal = (process.env.ALPACA_TRADING_URL ?? '').includes('api.alpaca.markets') && !(process.env.ALPACA_TRADING_URL ?? '').includes('paper');

  return (
    <main className="wrap" id="main">
      <section className="bar"><span className="tag gold">Owner · Live trading</span><span style={{ flex: '1 1 420px' }}>Your own Alpaca and Zerodha accounts, swing trades only, inside the guardrails: {DEFAULT_LIMITS.riskPct}% risk per trade, {DEFAULT_LIMITS.dailyLossPct}% daily stop, {DEFAULT_LIMITS.maxDrawdownPct}% drawdown stop, at most {DEFAULT_LIMITS.maxPositions} positions and {DEFAULT_LIMITS.maxOrdersPerDay} new orders a day. Only you can see this page.</span></section>
      {kite && <p className={kite === 'ok' ? 'green' : 'red'} style={{ margin: 0 }}>{kite === 'ok' ? 'Kite signed in for today.' : 'Kite sign-in did not complete. Try again.'}</p>}

      <section className="grid" aria-label="Switches">
        <article className="card"><div className="tag dim">Live trading</div><div className="big">{on ? 'ON' : 'OFF'}</div><p className="dim" style={{ margin: 0, fontSize: 12 }}>SIXXAB_LIVE_TRADING in Vercel and GitHub Secrets.</p></article>
        <article className="card"><div className="tag dim">Kill switch</div><div className={`big ${kill ? 'red' : 'green'}`}>{kill ? 'STOPPED' : 'ready'}</div><p className="dim" style={{ margin: 0, fontSize: 12 }}>Set SIXXAB_KILL_SWITCH=true to block every new order. Exits keep working.</p></article>
        <article className="card"><div className="tag dim">US account</div><div className="big">{usReal ? 'REAL' : 'PAPER'}</div><p className="dim" style={{ margin: 0, fontSize: 12 }}>Real money only when ALPACA_TRADING_URL is https://api.alpaca.markets.</p></article>
        <article className="card"><div className="tag dim">Zerodha Kite</div><div className="big">{kiteToday ? 'signed in' : 'sign in'}</div><p style={{ margin: 0, fontSize: 13 }}><a href="/api/broker/kite/login">Log in to Kite for today →</a></p><p className="dim" style={{ margin: 0, fontSize: 12 }}>{process.env.KITE_LIVE === 'true' ? 'KITE_LIVE=true: real orders (static IP machine only)' : 'Paper until KITE_LIVE=true'}</p></article>
      </section>

      {BROKERS.map((b) => {
        const rs = R.filter((r) => r.broker === b.key);
        const ts = T.filter((t) => t.broker === b.key);
        if (!rs.length && !ts.length) return null;
        const hist = [...rs].reverse().filter((r) => r.equity !== null).map((r) => ({ d: r.run_on, equity: Number(r.equity) }));
        const closed = ts.filter((t) => t.status === 'closed'), open = ts.filter((t) => t.status === 'open' || t.status === 'pending');
        const realised = closed.reduce((s, t) => s + Number(t.pnl ?? 0), 0);
        const wins = closed.filter((t) => Number(t.pnl ?? 0) > 0).length;
        const paper = b.key.endsWith('paper');
        const check = paper ? goLiveCheck({ days: new Set(rs.map((r) => r.run_on)).size, trades: ts.length, brokerErrors: rs.reduce((s, r) => s + r.broker_errors, 0), reconcileMismatches: rs.reduce((s, r) => s + r.reconcile_mismatches, 0), maxDrawdownPct: maxDrawdownPct(hist) }) : null;
        const cur = b.market === 'IN' ? '₹' : '$';
        return (
          <section key={b.key} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-label={b.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}><h2 style={{ margin: 0 }}>{b.label}</h2><span className="dim" style={{ fontSize: 12 }}>last run {rs[0] ? new Date(rs[0].run_at).toLocaleString('en-US', { timeZone: 'America/Chicago' }) : '—'} CT</span></div>
            <div className="grid">
              <div className="inset"><div className="muted" style={{ fontSize: 12 }}>Equity</div><div style={{ fontSize: 22, fontWeight: 800 }}>{hist.at(-1) ? `${cur}${hist.at(-1)!.equity.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}</div></div>
              <div className="inset"><div className="muted" style={{ fontSize: 12 }}>Realised P&amp;L</div><div className={realised >= 0 ? 'green' : 'red'} style={{ fontSize: 22, fontWeight: 800 }}>{cur}{realised.toFixed(2)}</div></div>
              <div className="inset"><div className="muted" style={{ fontSize: 12 }}>Closed trades · win rate</div><div style={{ fontSize: 22, fontWeight: 800 }}>{closed.length} · {closed.length ? Math.round((wins / closed.length) * 100) : 0}%</div></div>
              <div className="inset"><div className="muted" style={{ fontSize: 12 }}>Max drawdown</div><div style={{ fontSize: 22, fontWeight: 800 }}>{maxDrawdownPct(hist)}%</div></div>
            </div>
            {hist.length > 2 && <Sparkline points={hist.map((h) => h.equity)} label="Account equity" />}
            {check && <div className="inset" style={{ borderLeft: `3px solid ${check.ready ? 'var(--green)' : 'var(--gold)'}` }}><b>{check.ready ? 'Ready for real money' : 'Paper phase: not ready for real money yet'}</b><ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 13 }}>{check.passed.map((p) => <li key={p} className="green">✓ {p}</li>)}{check.failed.map((p) => <li key={p}>○ {p}</li>)}</ul></div>}
            {open.length > 0 && <table className="compact"><thead><tr><th>Symbol</th><th>Status</th><th>Qty</th><th>Entry</th><th>Stop</th><th>Target</th><th>Score</th></tr></thead><tbody>{open.map((t) => <tr key={t.id}><td>{t.symbol}</td><td>{t.status}</td><td>{t.qty}</td><td>{t.fill_price ?? t.entry}</td><td>{t.stop}</td><td>{t.target}</td><td>{t.setup_score ?? '—'}</td></tr>)}</tbody></table>}
            {closed.length > 0 && <details><summary>Closed trades ({closed.length})</summary><table className="compact"><thead><tr><th>Symbol</th><th>Closed</th><th>Exit</th><th>Why</th><th>P&amp;L</th></tr></thead><tbody>{closed.slice(0, 40).map((t) => <tr key={t.id}><td>{t.symbol}</td><td>{t.closed_on}</td><td>{t.exit_price}</td><td>{t.exit_reason}</td><td className={Number(t.pnl) >= 0 ? 'green' : 'red'}>{Number(t.pnl ?? 0).toFixed(2)}</td></tr>)}</tbody></table></details>}
            {rs[0] && <details><summary>Last run log</summary><pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, margin: 0 }}>{(rs[0].log ?? []).join('\n')}</pre></details>}
          </section>
        );
      })}

      {[btUS as BT, btIN as BT].map((bt) => (
        <section key={bt.market} className="card" aria-label={`Backtest ${bt.market}`}>
          <h2 style={{ marginBottom: 4 }}>Backtest · {bt.market === 'US' ? 'US swing engine' : 'India swing engine'}</h2>
          {!bt.variants.length ? <p className="muted" style={{ margin: 0 }}>{bt.note}</p> : <>
            <p className="muted" style={{ margin: '0 0 8px', fontSize: 13 }}>{bt.variants[0].from} to {bt.variants[0].to} · start {bt.currency} {bt.startCash.toLocaleString()} · vs {bt.benchmark}. {bt.note}</p>
            <table className="compact"><thead><tr><th>Rules</th><th>Return</th><th>CAGR</th><th>Max DD</th><th>{bt.benchmark} CAGR</th><th>{bt.benchmark} max DD</th><th>Trades</th><th>Win rate</th><th>Profit factor</th><th>Time invested</th></tr></thead>
              <tbody>{bt.variants.map((v) => <tr key={v.name}><td>{v.name}</td><td>{v.totalReturnPct}%</td><td>{v.cagrPct}%</td><td>{v.maxDrawdownPct}%</td><td>{v.benchCagrPct}%</td><td>{v.benchMaxDrawdownPct}%</td><td>{v.stats.closed}</td><td>{Math.round(v.stats.winRate)}%</td><td>{v.stats.profitFactor ?? '—'}</td><td>{v.exposurePct}%</td></tr>)}</tbody></table>
          </>}
        </section>
      ))}
      <p className="dim" style={{ margin: 0, fontSize: 12 }}>Your own accounts and your own decisions. Past and simulated results do not guarantee future results. <Link href="/my-money/grow">Member paper trading →</Link></p>
    </main>
  );
}
