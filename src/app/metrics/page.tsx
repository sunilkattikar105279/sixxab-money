import type { Metadata } from 'next';
import Link from 'next/link';
import { Header, Footer } from '@/components/Header';
import { adminClient } from '@/lib/supabase/admin';
import { stats, type Outcome } from '@/lib/scorecard';
import { STAGES } from '@/lib/sixs';
import { FOUNDING_SPOTS } from '@/lib/growth';

export const metadata: Metadata = { title: 'Open metrics and scenario scorecard · SIXXAB Money', description: 'SIXXAB Money in numbers: members, weekly activity, and how every published setup played out.' };
export const revalidate = 600;

interface Metrics { members: number; members_7d: number; founding_taken: number; weekly_active: number; checkins_30d: number; questions_7d: number; briefs: number; paper_strategies: number; stage_counts: Record<string, number> }
interface Row { market: string; as_of: string; symbol: string; mode: string; side: string; entry: number; stop: number; target: number; outcome: Outcome; exit_price: number | null; r_multiple: number | null; resolved_on: string | null }

export default async function MetricsPage() {
  const db = adminClient();
  const [m, sc] = db ? await Promise.all([
    db.rpc('public_metrics').then((r) => (r.error ? null : (r.data as Metrics))),
    db.from('setup_outcomes').select('market, as_of, symbol, mode, side, entry, stop, target, outcome, exit_price, r_multiple, resolved_on').gte('as_of', new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10)).order('as_of', { ascending: false }).limit(1000).then((r) => (r.error ? null : (r.data as Row[]))),
  ]) : [null, null];
  const all = stats(sc ?? []);
  const byMode = (['invest', 'day'] as const).map((md) => ({ md, s: stats((sc ?? []).filter((r) => r.mode === md)) }));
  const recent = (sc ?? []).filter((r) => r.outcome !== 'open').sort((a, b) => (b.resolved_on ?? '').localeCompare(a.resolved_on ?? '')).slice(0, 15);
  const tile = (label: string, v: string | number, note?: string) => (
    <article className="card"><div className="tag dim">{label}</div><div style={{ font: '700 30px var(--head)', color: '#fff' }}>{v}</div>{note && <div className="muted" style={{ fontSize: 13 }}>{note}</div>}</article>
  );
  return (
    <>
      <Header active="" />
      <main className="wrap" id="main">
        <section className="bar"><span className="tag teal">Open metrics</span><span style={{ flex: '1 1 480px' }}>We publish our numbers and every setup&apos;s outcome, wins and losses, so you can judge the coach on its record.</span></section>
        {m ? (
          <section className="grid" aria-label="Community">
            {tile('Members', m.members, `+${m.members_7d} this week`)}
            {tile('Founding spots taken', `${m.founding_taken} / ${FOUNDING_SPOTS}`)}
            {tile('Weekly active', m.weekly_active, m.members ? `${Math.round((m.weekly_active / m.members) * 100)}% of members` : undefined)}
            {tile('Check-ins (30 days)', m.checkins_30d)}
            {tile('Coach questions (7 days)', m.questions_7d)}
            {tile('Daily briefs published', m.briefs)}
          </section>
        ) : <section className="card"><p className="muted" style={{ margin: 0 }}>Community numbers appear once the metrics function is installed (migration 0010).</p></section>}
        {m && Object.keys(m.stage_counts ?? {}).length > 0 && (
          <section className="card"><h2 style={{ marginBottom: 8 }}>Members by stage</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{STAGES.map((s) => <span key={s.key} className="chip flat">{s.n} {s.name}: {m.stage_counts[String(s.n)] ?? 0}</span>)}</div>
          </section>
        )}
        <section className="card">
          <h2 style={{ marginBottom: 4 }}>Scenario scorecard</h2>
          <p className="muted" style={{ margin: '0 0 8px', fontSize: 14 }}>Every long or short setup the screener publishes is tracked on daily closes until it reaches its target, hits its stop, or expires after 30 days. Last 120 days.</p>
          {sc && sc.length ? <>
            <div className="grid">
              {tile('Hit rate', all.hitRate === null ? '—' : `${all.hitRate}%`, `${all.hits} targets · ${all.stops} stops · ${all.expired} expired`)}
              {tile('Average result', all.avgR === null ? '—' : `${all.avgR > 0 ? '+' : ''}${all.avgR}R`, 'R = result ÷ risk to the stop')}
              {tile('Still open', all.open)}
              {byMode.map(({ md, s }) => tile(md === 'invest' ? 'Investment & swing' : 'Day trades', s.hitRate === null ? '—' : `${s.hitRate}%`, `${s.resolved} resolved`))}
            </div>
            {recent.length > 0 && <div className="scroll" style={{ marginTop: 8 }}><table className="compact">
              <thead><tr><th>Setup date</th><th>Stock</th><th>Mode</th><th>Side</th><th>Result</th><th style={{ textAlign: 'right' }}>R</th><th>Closed</th></tr></thead>
              <tbody>{recent.map((r) => <tr key={`${r.market}${r.symbol}${r.as_of}${r.mode}`}><td>{r.as_of}</td><td><Link href={`/stock/${r.market}/${encodeURIComponent(r.symbol)}`} className="mono">{r.symbol}</Link></td><td>{r.mode}</td><td>{r.side}</td><td><span className={`chip ${r.outcome === 'target' ? 'up' : r.outcome === 'stop' ? 'down' : 'flat'}`}>{r.outcome}</span></td><td className="mono" style={{ textAlign: 'right' }}>{r.r_multiple ?? '—'}</td><td>{r.resolved_on}</td></tr>)}</tbody>
            </table></div>}
          </> : <p className="muted" style={{ margin: 0 }}>Tracking starts with the next nightly scan. Results appear as setups reach their target or stop.</p>}
          <p className="dim" style={{ margin: '8px 0 0', fontSize: 12 }}>Past results do not guarantee future results. Scenarios are educational, not recommendations. India setups are tracked without published levels.</p>
        </section>
        <Footer note="Aggregate counts only; no personal data is shown" />
      </main>
    </>
  );
}
