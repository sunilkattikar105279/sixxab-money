import type { Events } from '@/lib/events';
import { daysUntil, fmt } from '@/lib/events';

/** Moat: the next earnings date, the last surprises, and insider open-market trades in the past 90 days. */
export function EventsCard({ e }: { e: Events }) {
  const d = daysUntil(e.nextEarnings);
  const soon = d !== null && d >= 0 && d <= 5;
  return (
    <section className="card" aria-label="Moat: earnings and insiders" style={soon ? { borderColor: 'var(--gold)' } : undefined}>
      <h2 style={{ marginBottom: 8 }}>Moat · Earnings and insiders</h2>
      {e.nextEarnings && d !== null && d >= 0 ? (
        <p style={{ margin: 0 }}><b>Next earnings:</b> {e.nextEarnings}{e.earningsHour === 'amc' ? ' (after close)' : e.earningsHour === 'bmo' ? ' (before open)' : ''} · <span className={soon ? 'gold' : 'muted'}>{d === 0 ? 'today' : `in ${d} day${d === 1 ? '' : 's'}`}</span></p>
      ) : <p className="muted" style={{ margin: 0 }}>No earnings date in the next 90 days.</p>}
      {soon && <p className="gold" style={{ margin: '4px 0 0', fontSize: 13 }}>Results can move the price past any stop overnight. Many traders wait until after the report.</p>}
      {e.surprises.length > 0 && (
        <table className="compact" style={{ marginTop: 8 }}>
          <thead><tr><th>Quarter</th><th style={{ textAlign: 'right' }}>EPS actual</th><th style={{ textAlign: 'right' }}>Estimate</th><th style={{ textAlign: 'right' }}>Surprise</th></tr></thead>
          <tbody>{e.surprises.map((s) => (
            <tr key={s.period}><td>{s.period}</td><td className="mono" style={{ textAlign: 'right' }}>{s.actual ?? '—'}</td><td className="mono" style={{ textAlign: 'right' }}>{s.estimate ?? '—'}</td>
              <td className={`mono ${s.surprisePct == null ? '' : s.surprisePct >= 0 ? 'green' : 'red'}`} style={{ textAlign: 'right' }}>{s.surprisePct == null ? '—' : `${s.surprisePct >= 0 ? '+' : ''}${s.surprisePct.toFixed(1)}%`}</td></tr>
          ))}</tbody>
        </table>
      )}
      {e.insider && (
        <div style={{ marginTop: 8 }}>
          <p style={{ margin: 0 }}><b>Insiders, last 90 days (open market):</b>{' '}
            {e.insider.buys || e.insider.sells
              ? <>{e.insider.buys} buy{e.insider.buys === 1 ? '' : 's'} (${fmt(e.insider.buyValue)}, {e.insider.buyers} people) · {e.insider.sells} sell{e.insider.sells === 1 ? '' : 's'} (${fmt(e.insider.sellValue)})</>
              : 'no open-market buys or sells'}
          </p>
          {e.insider.latest.length > 0 && <ul className="muted" style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 13 }}>{e.insider.latest.slice(0, 3).map((t, i) => <li key={i}>{t.date}: {t.name} {t.code === 'P' ? 'bought' : 'sold'} {fmt(Math.abs(t.change))} shares{t.price ? ` at ${t.price}` : ''}</li>)}</ul>}
          <p className="dim" style={{ margin: '4px 0 0', fontSize: 12 }}>Insiders sell for many reasons (taxes, diversification); buying with their own money is the stronger signal.</p>
        </div>
      )}
      <p className="dim" style={{ margin: '6px 0 0', fontSize: 12 }}>Source: Finnhub (SEC Form 4, earnings calendar) · as of {e.asOf}</p>
    </section>
  );
}
