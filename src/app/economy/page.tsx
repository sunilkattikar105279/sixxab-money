import Link from 'next/link';
import { Header, Footer } from '@/components/Header';
import { AgentAsk } from '@/components/AgentAsk';
import { getIndicator, INDICATORS, GROUPS } from '@/lib/data/fred';
import { VideoRail } from '@/components/VideoRail';
import { videos } from '@/lib/media';
import { adminClient } from '@/lib/supabase/admin';
import { macroSnapshot } from '@/lib/data/macro';
import { TileGrid, RelationChart } from '@/components/MacroCharts';

export const revalidate = 3600;

const MEANS: Record<string, string> = {
  fed_funds: 'Sets the cost of loans, cards and savings yields.',
  cpi: 'How fast prices rise; compare with your raise and savings rate.',
  unemployment: 'Job-market health; a cue to check your emergency fund.',
  ten_year: 'Drives mortgage rates.',
  mortgage_30y: 'What a new home loan costs.',
  gdp_growth: 'Overall pace of the economy.',
  usd_inr: 'A higher number means a weaker rupee: costlier fuel, gadgets and US tuition.',
  brent: 'Fuel and transport costs everywhere.',
  dollar_index: 'A strong dollar makes imports cheaper for the US and dearer for everyone else.',
};
const PENDING: Record<'US' | 'IN' | 'GLOBAL', [string, string, string][]> = {
  US: [],
  IN: [['RBI', 'Repo rate', 'Sets home-loan EMIs and FD rates.'], ['MOSPI', 'CPI inflation', 'Compare with your FD and salary hike.'], ['MOSPI', 'GDP growth', 'Pace of the economy.']],
  GLOBAL: [['IMF', 'World growth', 'Pace of the global economy.'], ['ECB', 'Euro area rate', 'Europe’s cost of money.']],
};
const NAMES = { US: 'United States', IN: 'India', GLOBAL: 'Global' } as const;

export default async function Economy({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const country = c === 'IN' || c === 'GLOBAL' ? c : 'US';
  const keys = GROUPS[country];
  const db = adminClient();
  const [values, clips, events, macro] = await Promise.all([
    Promise.all(keys.map((k) => getIndicator(k))),
    videos({ topic: 'economy', limit: 4 }),
    db ? db.from('econ_events').select('event_date, event, why, source').eq('country', country).gte('event_date', new Date().toISOString().slice(0, 10)).order('event_date').limit(8).then((r) => r.data ?? []) : Promise.resolve([]),
    country === 'US' ? macroSnapshot() : Promise.resolve(null),
  ]);
  return (
    <>
      <Header active="Economy" />
      <main className="wrap" id="main">
        <section className="bar"><span className="tag teal">Macro · Economy agent</span><span style={{ flex: '1 1 480px' }}>Each indicator shows its latest value, source and date, and what it means for your money.</span></section>
        <nav className="seg" aria-label="Country" style={{ alignSelf: 'flex-start' }}>
          {(['US', 'IN', 'GLOBAL'] as const).map((k) => <Link key={k} href={`/economy?c=${k}`} aria-current={k === country ? 'true' : undefined}>{k === 'IN' ? 'India' : k === 'GLOBAL' ? 'Global' : 'US'}</Link>)}
        </nav>
        <h2>{NAMES[country]}</h2>
        <section className="grid" aria-label="Indicators">
          {keys.map((key, i) => {
            const meta = INDICATORS[key], v = values[i];
            return (
              <article key={key} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="tag dim">FRED {meta.seriesId}{v ? ` · ${v.date}` : ''}</div>
                <h2>{meta.label}</h2>
                <div className="big">{v ? `${v.value.toLocaleString('en-US', { maximumFractionDigits: 2 })}${meta.units === '%' ? '%' : ''}` : '—'}</div>
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>{MEANS[key]}</p>
              </article>
            );
          })}
          {PENDING[country].map(([src, name, means]) => (
            <article key={name} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="tag dim">{src}</div><h2>{name}</h2><div className="big">—</div>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>{means} Connector in progress.</p>
            </article>
          ))}
        </section>
        {macro?.available && <>
          <section aria-label="Recession watch" className="card" style={{ borderColor: macro.watch.flags.length >= 2 ? 'var(--red)' : macro.watch.flags.length ? 'var(--gold)' : 'var(--line2)' }}>
            <div className="tag teal">Macro · Recession watch</div>
            <h2 style={{ margin: '6px 0 4px' }}>{macro.watch.read}</h2>
            {macro.watch.flags.length > 0 ? <ul style={{ margin: 0, paddingLeft: 18 }}>{macro.watch.flags.map((f) => <li key={f}>{f}</li>)}</ul> : <p className="muted" style={{ margin: 0 }}>Yield curve, jobless claims, the unemployment trend (Sahm rule) and credit spreads are all outside warning levels.</p>}
          </section>

          <h2 id="money">Money supply and liquidity (M2)</h2>
          <p className="muted" style={{ margin: 0 }}>Tide, our liquidity agent, tracks M2 in depth with a Tide score and new-release alerts. <Link href="/liquidity">Open the M2 tracker →</Link></p>
          <TileGrid tiles={macro.money} />
          {macro.relations.length > 0 && <section className="card" aria-label="How money supply relates to inflation and stocks">
            <h2 style={{ marginBottom: 4 }}>How M2 relates to inflation and stocks</h2>
            <p className="muted" style={{ margin: '0 0 8px', fontSize: 14 }}>Correlation (r) runs from −1 to +1: past relationships, not a forecast. Lines are on their own scales so the shapes can be compared.</p>
            <div style={{ display: 'grid', gap: 18 }}>{macro.relations.map((r) => <div key={r.title}><h3 style={{ margin: '0 0 4px' }}>{r.title}</h3><RelationChart rel={r} /><p style={{ margin: '4px 0 0', fontSize: 14 }}>{r.read}</p></div>)}</div>
          </section>}

          <h2 id="housing">Housing market</h2>
          {macro.housingRead && <p className="muted" style={{ margin: 0 }}>{macro.housingRead}</p>}
          <TileGrid tiles={macro.housing} />
          {macro.housingRelation && <section className="card" aria-label={macro.housingRelation.title}><h2 style={{ marginBottom: 4 }}>{macro.housingRelation.title}</h2><RelationChart rel={macro.housingRelation} /><p style={{ margin: '4px 0 0', fontSize: 14 }}>{macro.housingRelation.read}</p></section>}

          <h2 id="dashboard">Economy dashboard</h2>
          <TileGrid tiles={macro.economy} />
          <p className="dim" style={{ margin: 0, fontSize: 12 }}>Source: FRED, Federal Reserve Bank of St. Louis (M2SL, M2REAL, M2V, WALCL, RRPONTSYD, WTREGEN, SP500, CPIAUCSL, PCEPILFE, PAYEMS, UNRATE, ICSA, RSAFS, INDPRO, UMCSENT, DFF, T10Y2Y, BAMLH0A0HYM2, MORTGAGE30US, CSUSHPINSA, MSPUS, HOUST, PERMIT, EXHOSLUSM495S, MSACSR). Educational, not a forecast.</p>
        </>}
        <div className="cols">
          <section className="card main scroll" aria-label="Calendar">
            <h2 style={{ marginBottom: 8 }}>Coming up</h2>
            {events.length ? (
              <table className="compact"><thead><tr><th>Date</th><th>Event</th><th>Why it matters to you</th></tr></thead>
                <tbody>{events.map((e) => <tr key={e.event_date + e.event}><td className="mono">{e.event_date}</td><td style={{ color: '#fff', fontWeight: 600 }}>{e.event}</td><td className="muted">{e.why}</td></tr>)}</tbody></table>
            ) : <p className="muted" style={{ margin: 0 }}>The calendar fills from the econ_events table (Fed, RBI, CPI, jobs and GDP dates).</p>}
          </section>
          <aside className="side">
            <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-label="What it means for your money">
              <h2>What it means for your money</h2>
              <div className="inset"><div className="tag gold">Loans &amp; EMI</div><div>If rates stay high, variable-rate loans and EMIs stay expensive. Ask the agent for your payment under three rate scenarios.</div></div>
              <div className="inset"><div className="tag gold">Savings</div><div>Compare your savings rate with inflation: if inflation is higher, cash loses buying power.</div></div>
              <div className="inset"><div className="tag gold">Jobs</div><div>A weak jobs report is a cue to check your emergency fund, not to panic-sell.</div></div>
            </section>
          </aside>
        </div>
        <VideoRail title="Economy explained in 60 seconds" items={clips} />
        <AgentAsk title="Ask Macro" suggestions={['How does M2 money supply affect inflation and stocks?', 'Is now a good time to buy a home with these mortgage rates?', 'What does a Fed cut mean for my mortgage?', 'How does an RBI repo-rate change affect my home loan EMI?', 'Is inflation eating my fixed deposit?']} />
        <Footer note="Data: FRED (Federal Reserve Bank of St. Louis) · India RBI and MOSPI connectors in progress" />
      </main>
    </>
  );
}
