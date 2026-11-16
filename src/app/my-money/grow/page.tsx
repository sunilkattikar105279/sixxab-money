import type { Metadata } from 'next';
import Link from 'next/link';
import { getMember } from '@/lib/member';
import { formatMoney } from '@/lib/sixs';
import { stats, maxDrawdownPct, pnlOf, type Trade } from '@/lib/autotrade';
import { levelsAllowed } from '@/lib/compliance';
import { liveTradingEnabled, isRealMoney } from '@/lib/providers/alpaca-trading';
import { Sparkline } from '@/components/Sparkline';
import { StrategyForm, GrowControls } from '@/components/GrowActions';

export const metadata: Metadata = { title: 'Grow money' };

interface Row { id: number; symbol: string; side: 'long' | 'short'; status: Trade['status']; qty: number; entry: number; stop: number; target: number; fill_price: number | null; exit_price: number | null; exit_reason: string | null; pnl: number | null; setup_score: number | null; reasons: string[]; created_on: string; opened_on: string | null; closed_on: string | null; broker_order_id: string | null }

export default async function Grow() {
  const m = (await getMember())!;
  const me = m.member!;

  if (!me.adult) {
    return (
      <main className="wrap" id="main">
        <section className="card" style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="tag gold">Unlocks at 18</div>
          <h1 style={{ fontSize: 26 }}>Grow money starts with learning</h1>
          <p className="muted" style={{ margin: 0 }}>Trading tools are for adults. Right now the biggest growth lever is time: money saved at 15 has decades to compound. Learn how saving, interest and index funds work, and practise with your savings goals.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><Link href="/learn" className="btn btn-gold">Open Learn</Link><Link href="/my-money/journey" className="btn btn-line">My savings plan</Link></div>
        </section>
      </main>
    );
  }

  const [{ data: strategy }, { data: account }, { data: trades }] = await Promise.all([
    m.sb.from('strategies').select('*').eq('member_id', me.id).maybeSingle(),
    m.sb.from('paper_accounts').select('*').eq('member_id', me.id).maybeSingle(),
    m.sb.from('paper_trades').select('*').eq('member_id', me.id).order('created_at', { ascending: false }).limit(200),
  ]);
  const market = (strategy?.market as 'US' | 'IN' | undefined) ?? 'US';
  const showLevels = levelsAllowed(market);
  const { data: asOfRow } = await m.sb.from('screener_setups').select('as_of').eq('market', market).eq('mode', 'invest').order('as_of', { ascending: false }).limit(1).maybeSingle();
  const [sig, { data: quotes }] = await Promise.all([
    asOfRow ? m.sb.from('screener_setups').select('symbol, side, entry, stop, target, rr, with_trend, reasons, score').eq('market', market).eq('mode', 'invest').eq('as_of', asOfRow.as_of).in('side', ['long', 'short']).order('score', { ascending: false }).limit(12) : null,
    m.sb.from('stock_quotes').select('symbol, price, as_of').eq('market', market).order('as_of', { ascending: false }).limit(80),
  ]);
  const signals = sig?.data ?? [];
  const last: Record<string, number> = {};
  for (const q of quotes ?? []) if (last[q.symbol] == null && q.price != null) last[q.symbol] = Number(q.price);

  const ts: (Trade & { brokerOrderId: string | null })[] = ((trades ?? []) as Row[]).map((r) => ({ id: r.id, symbol: r.symbol, side: r.side, status: r.status, qty: Number(r.qty), entry: Number(r.entry), stop: Number(r.stop), target: Number(r.target), fillPrice: r.fill_price == null ? null : Number(r.fill_price), exitPrice: r.exit_price == null ? null : Number(r.exit_price), exitReason: r.exit_reason, pnl: r.pnl == null ? null : Number(r.pnl), setupScore: Number(r.setup_score ?? 0), reasons: r.reasons ?? [], createdOn: r.created_on, openedOn: r.opened_on, closedOn: r.closed_on, brokerOrderId: r.broker_order_id }));
  const open = ts.filter((t) => t.status === 'open');
  const pending = ts.filter((t) => t.status === 'pending');
  const closed = ts.filter((t) => ['closed', 'expired', 'cancelled'].includes(t.status));
  const st = stats(ts);
  const cur = account?.currency === 'INR' ? 'IN' : 'US';
  const fmt = (v: number) => formatMoney(v, cur);
  const fmt2 = (v: number) => new Intl.NumberFormat(cur === 'IN' ? 'en-IN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  const history = ((account?.equity_history as { d: string; equity: number }[]) ?? []);
  const ret = account ? ((Number(account.equity) - Number(account.starting_cash)) / Number(account.starting_cash)) * 100 : 0;
  const openPnl = open.reduce((s, t) => s + pnlOf(t, last[t.symbol] ?? t.fillPrice ?? t.entry), 0);
  const ownerBroker = me.role === 'admin' && liveTradingEnabled();
  const brokerLabel = strategy?.broker === 'alpaca' ? (isRealMoney() ? 'Alpaca · REAL MONEY' : 'Alpaca paper account') : 'SIXXAB paper account (simulated)';
  const minScore = Number(strategy?.min_score ?? 7);

  return (
    <main className="wrap" id="main">
      <section className="bar">
        <span className="tag green">Grow money</span>
        <span style={{ flex: '1 1 420px' }}>Rule-based auto-trading: each night the engine reads the signals and levels, places orders that match your rules, and manages every trade with a stop and a target. Practice trades on a paper account; no real money moves.</span>
      </section>

      {!strategy || !account ? (
        <div className="cols">
          <div className="main">
            <section className="card">
              <h2 style={{ marginBottom: 12 }}>How auto-trading works</h2>
              <ol className="how">
                <li><b>Signals.</b> Every evening the scanner scores each stock 1–10 from trend, momentum, accumulation and distribution, Wyckoff phase, Elliott wave structure, company results and news.</li>
                <li><b>Levels.</b> Stocks with a clean setup get an entry, a stop below support and a target at 2× the risk (1× when trading against the trend).</li>
                <li><b>Your rules.</b> You choose the minimum score, how much to risk per trade, the largest position and how many trades at once.</li>
                <li><b>Auto-trades.</b> The engine places matching orders, fills them when price reaches the entry, exits at the stop or target, and pauses for a day if losses hit your daily limit.</li>
              </ol>
              <p className="dim" style={{ margin: '12px 0 0', fontSize: 12 }}>Trades are checked on daily closing prices (swing trading, days to weeks). Educational simulation; results do not predict real returns.</p>
            </section>
          </div>
          <aside className="side">
            <section className="card">
              <h2 style={{ marginBottom: 4 }}>Set your rules</h2>
              <p className="muted" style={{ margin: '0 0 12px' }}>Start with a {me.country === 'IN' ? '₹10,00,000' : '$10,000'} practice account. You can change rules any time.</p>
              <StrategyForm country={me.country} ownerBroker={ownerBroker} indiaAllowed={levelsAllowed('IN')} />
            </section>
          </aside>
        </div>
      ) : (
        <>
          <section className="grid" aria-label="Account">
            <div className="card"><div className="tag dim">Account value</div><div className="big">{fmt(Number(account.equity))}</div><div className={ret >= 0 ? 'green' : 'red'}>{ret >= 0 ? '+' : ''}{ret.toFixed(2)}% since {history[0]?.d ?? 'start'}</div></div>
            <div className="card"><div className="tag dim">Cash</div><div className="big">{fmt(Number(account.cash))}</div><div className="muted" style={{ fontSize: 12 }}>Open P&amp;L {openPnl >= 0 ? '+' : ''}{fmt2(openPnl)}</div></div>
            <div className="card"><div className="tag dim">Win rate</div><div className="big">{st.closed ? `${st.winRate.toFixed(0)}%` : '—'}</div><div className="muted" style={{ fontSize: 12 }}>{st.closed} closed trades · profit factor {st.profitFactor ?? '—'}</div></div>
            <div className="card"><div className="tag dim">Max drawdown</div><div className="big">{maxDrawdownPct(history)}%</div><div className="muted" style={{ fontSize: 12 }}>Largest fall from a peak</div></div>
          </section>

          <section className="card">
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 8 }}>
              <div><h2>{strategy.name}</h2><div className="dim" style={{ fontSize: 12 }}>{brokerLabel} · {strategy.market} · swing (daily) · score ≥ {minScore} · risk {Number(strategy.risk_pct)}% per trade · up to {strategy.max_positions} positions</div></div>
              <GrowControls active={strategy.active} />
            </div>
            <Sparkline points={history.map((h) => h.equity)} height={80} />
            {account.paused_until && account.paused_until > new Date().toISOString().slice(0, 10) && <p className="gold" style={{ margin: '6px 0 0' }}>Daily loss limit reached: no new orders until {account.paused_until}.</p>}
            {!strategy.active && <p className="gold" style={{ margin: '6px 0 0' }}>Paused: open trades keep their stops and targets, but no new orders are placed.</p>}
          </section>

          <div className="cols">
            <div className="main">
              <section className="card scroll">
                <h2 style={{ marginBottom: 8 }}>Open positions ({open.length})</h2>
                {open.length ? (
                  <table className="compact">
                    <thead><tr><th>Stock</th><th>Side</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Filled</th><th style={{ textAlign: 'right' }}>Last</th><th style={{ textAlign: 'right' }}>Stop</th><th style={{ textAlign: 'right' }}>Target</th><th style={{ textAlign: 'right' }}>P&amp;L</th></tr></thead>
                    <tbody>{open.map((t) => { const p = last[t.symbol] ?? t.fillPrice ?? t.entry; const pl = pnlOf(t, p); return (
                      <tr key={t.id}><td className="mono"><Link href={`/stock/${market}/${encodeURIComponent(t.symbol)}`}>{t.symbol}</Link></td><td className={t.side === 'long' ? 'green' : 'red'}>{t.side}</td><td className="mono" style={{ textAlign: 'right' }}>{t.qty}</td><td className="mono" style={{ textAlign: 'right' }}>{fmt2(t.fillPrice ?? t.entry)}</td><td className="mono" style={{ textAlign: 'right' }}>{fmt2(p)}</td><td className="mono red" style={{ textAlign: 'right' }}>{fmt2(t.stop)}</td><td className="mono green" style={{ textAlign: 'right' }}>{fmt2(t.target)}</td><td className={`mono ${pl >= 0 ? 'green' : 'red'}`} style={{ textAlign: 'right' }}>{pl >= 0 ? '+' : ''}{fmt2(pl)}</td></tr>
                    ); })}</tbody>
                  </table>
                ) : <p className="muted" style={{ margin: 0 }}>No open positions. New orders are placed after tonight’s scan when setups match your rules.</p>}
              </section>

              {pending.length > 0 && (
                <section className="card scroll">
                  <h2 style={{ marginBottom: 8 }}>Waiting orders ({pending.length})</h2>
                  <table className="compact"><thead><tr><th>Stock</th><th>Side</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Entry</th><th style={{ textAlign: 'right' }}>Stop</th><th style={{ textAlign: 'right' }}>Target</th><th>Placed</th></tr></thead>
                    <tbody>{pending.map((t) => <tr key={t.id}><td className="mono">{t.symbol}</td><td className={t.side === 'long' ? 'green' : 'red'}>{t.side}</td><td className="mono" style={{ textAlign: 'right' }}>{t.qty}</td><td className="mono" style={{ textAlign: 'right' }}>{fmt2(t.entry)}</td><td className="mono red" style={{ textAlign: 'right' }}>{fmt2(t.stop)}</td><td className="mono green" style={{ textAlign: 'right' }}>{fmt2(t.target)}</td><td className="dim mono">{t.createdOn}{t.brokerOrderId ? ' · sent to broker' : ''}</td></tr>)}</tbody>
                  </table>
                  <p className="dim" style={{ margin: '6px 0 0', fontSize: 12 }}>Orders fill when the price reaches the entry, are cancelled if price hits the stop first, and expire after 5 days.</p>
                </section>
              )}

              <section className="card scroll">
                <h2 style={{ marginBottom: 8 }}>Trade log</h2>
                {closed.length ? (
                  <table className="compact"><thead><tr><th>Closed</th><th>Stock</th><th>Side</th><th style={{ textAlign: 'right' }}>Entry</th><th style={{ textAlign: 'right' }}>Exit</th><th>Why</th><th style={{ textAlign: 'right' }}>P&amp;L</th></tr></thead>
                    <tbody>{closed.slice(0, 50).map((t) => <tr key={t.id}><td className="dim mono">{t.closedOn}</td><td className="mono">{t.symbol}</td><td>{t.side}</td><td className="mono" style={{ textAlign: 'right' }}>{t.fillPrice != null ? fmt2(t.fillPrice) : '—'}</td><td className="mono" style={{ textAlign: 'right' }}>{t.exitPrice != null ? fmt2(t.exitPrice) : '—'}</td><td className="muted">{t.status === 'closed' ? (t.exitReason === 'target' ? 'Hit target' : 'Hit stop') : t.status === 'expired' ? 'Order expired' : 'Setup broke'}</td><td className={`mono ${(t.pnl ?? 0) >= 0 ? 'green' : 'red'}`} style={{ textAlign: 'right' }}>{t.pnl != null ? `${t.pnl >= 0 ? '+' : ''}${fmt2(t.pnl)}` : '—'}</td></tr>)}</tbody>
                  </table>
                ) : <p className="muted" style={{ margin: 0 }}>Closed trades and the reason for each exit appear here.</p>}
              </section>
            </div>

            <aside className="side">
              <section className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}><h2>Tonight’s signals</h2><span className="dim mono" style={{ fontSize: 12 }}>{asOfRow?.as_of ?? 'no scan yet'}</span></div>
                {!showLevels ? <p className="muted" style={{ margin: 0 }}>India levels are hidden until SEBI research-analyst registration.</p>
                  : signals.length ? (
                    <ul className="signals">
                      {signals.map((s) => {
                        const match = s.score >= minScore && (!strategy.with_trend_only || s.with_trend) && (s.side === 'long' || strategy.allow_short);
                        return (
                          <li key={s.symbol} className="inset">
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                              <span><b className="mono">{s.symbol}</b> <span className={s.side === 'long' ? 'green' : 'red'}>{s.side}</span></span>
                              <span className="mono gold">{Number(s.score).toFixed(1)}/10</span>
                            </div>
                            <div className="mono dim" style={{ fontSize: 12 }}>entry {fmt2(Number(s.entry))} · stop {fmt2(Number(s.stop))} · target {fmt2(Number(s.target))} · {Number(s.rr)}R</div>
                            <div className="muted" style={{ fontSize: 12 }}>{(s.reasons ?? []).slice(0, 2).join(' · ')}</div>
                            <div style={{ fontSize: 11 }} className={match ? 'teal' : 'dim'}>{match ? '✓ matches your rules' : 'outside your rules'}</div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : <p className="muted" style={{ margin: 0 }}>Signals appear after the nightly scan runs.</p>}
                <Link href="/screener" style={{ display: 'inline-block', marginTop: 8 }}>Open the full screener →</Link>
              </section>

              <section className="card">
                <h2 style={{ marginBottom: 8 }}>Your rules</h2>
                <StrategyForm country={me.country} ownerBroker={ownerBroker} indiaAllowed={levelsAllowed('IN')} existing={{ name: strategy.name, market: strategy.market, minScore, riskPct: Number(strategy.risk_pct), maxPositionPct: Number(strategy.max_position_pct), maxPositions: strategy.max_positions, dailyLossPct: Number(strategy.daily_loss_pct), allowShort: strategy.allow_short, withTrendOnly: strategy.with_trend_only, broker: strategy.broker }} />
              </section>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
