import { Header, Footer } from '@/components/Header';
import { AgentAsk } from '@/components/AgentAsk';
import { adminClient } from '@/lib/supabase/admin';

export const revalidate = 600;

interface Brief { id: string; tag: string; title: string; facts: string[]; view_a: string; view_b: string; money: string; sources: string; published_on: string }

const SAMPLE: Brief = {
  id: 'sample', tag: 'Corporate governance · US', published_on: '2026-11-12',
  title: 'Nvidia’s CEO resigns; CFO named interim chief',
  facts: [
    'Jensen Huang resigned as president, CEO and board member, effective immediately (Nvidia 8-K).',
    'CFO Colette Kress is interim CEO; the board is searching internal and external candidates.',
    'Reports said U.S. officials tied a woman he admitted an affair with to Chinese intelligence; China denies it.',
  ],
  view_a: '[Strongest case from those who say the board acted correctly, quoting named people, with sources.]',
  view_b: '[Strongest case from those who disagree, quoting named people, with sources.]',
  money: 'If you own an S&P 500 or Nasdaq index fund, you own Nvidia. One company’s news can move your whole fund, which is why spreading money across many holdings matters.',
  sources: 'Nvidia 8-K (Nov 12, 2026), Reuters, NYT, CNBC',
};

async function briefs(): Promise<Brief[]> {
  const db = adminClient();
  if (!db) return [SAMPLE];
  const { data } = await db.from('policy_briefs').select('*').eq('status', 'published').order('published_on', { ascending: false }).limit(10);
  return data && data.length ? (data as Brief[]) : [SAMPLE];
}

export default async function World() {
  const list = await briefs();
  const [top, ...rest] = list;
  return (
    <>
      <Header active="World & Policy" />
      <main className="wrap">
        <section className="bar"><span className="tag teal">World &amp; policy agent</span><span style={{ flex: '1 1 480px' }}>Every brief shows the facts, each side’s strongest case, and what it means for your money. We never take a side.</span></section>
        <div className="cols">
          <article className="card main" style={{ gap: 14 }}>
            <div className="tag gold">{top.tag} · {top.published_on}</div>
            <h1 style={{ fontSize: 26 }}>{top.title}</h1>
            <section><h3 className="tag teal">The facts</h3><ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{top.facts.map((f) => <li key={f}>{f}</li>)}</ul></section>
            <div className="grid">
              <section className="inset"><h3 className="tag dim">One view</h3><p style={{ margin: '6px 0 0' }}>{top.view_a}</p></section>
              <section className="inset"><h3 className="tag dim">Another view</h3><p style={{ margin: '6px 0 0' }}>{top.view_b}</p></section>
            </div>
            <section className="inset" style={{ border: '1px solid var(--gold)' }}><h3 className="tag gold">What it means for your money</h3><p style={{ margin: '6px 0 0' }}>{top.money}</p></section>
            <div className="dim" style={{ fontSize: 12 }}>Sources: {top.sources}</div>
          </article>
          <aside className="side">
            <section className="card">
              <h2 style={{ marginBottom: 8 }}>Policy tracker</h2>
              {rest.length ? rest.map((b) => (
                <div key={b.id} style={{ padding: '12px 0', borderTop: '1px solid var(--line)' }}><div className="tag gold">{b.tag}</div><div style={{ fontWeight: 600, color: '#fff' }}>{b.title}</div><div className="muted" style={{ fontSize: 12 }}>{b.money}</div></div>
              )) : <p className="muted" style={{ margin: 0 }}>New briefs appear here after editorial and guardrail review.</p>}
            </section>
            <AgentAsk title="Ask the world & policy agent" suggestions={['What would new US tariffs mean for prices in India?', 'How do sanctions affect oil prices?']} />
          </aside>
        </div>
        <Footer note="Briefs pass the guardrail agent and a human editor: sources on every claim, both sides, no endorsements" />
      </main>
    </>
  );
}
