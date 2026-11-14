import { Header, Footer } from '@/components/Header';
import { AgentAsk } from '@/components/AgentAsk';
import Link from 'next/link';
import { Reel } from '@/components/Reel';
import { policyBriefs, TOPICS, SAMPLE_BRIEF } from '@/lib/data/policy';
import { LIBRARY } from '@/lib/media';

export const revalidate = 600;

export default async function World({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const topic = TOPICS.find((x) => x === t) ?? 'All';
  const list = await policyBriefs(topic);
  const [top, ...rest] = list.length ? list : [SAMPLE_BRIEF];
  return (
    <>
      <Header active="World & Policy" />
      <main className="wrap">
        <section className="bar"><span className="tag teal">World &amp; policy agent</span><span style={{ flex: '1 1 480px' }}>Every brief shows the facts, each side’s strongest case, and what it means for your money. We never take a side.</span></section>
        <nav aria-label="Topic" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {TOPICS.map((x) => <Link key={x} href={x === 'All' ? '/world' : `/world?t=${encodeURIComponent(x)}`} aria-current={x === topic ? 'true' : undefined} style={{ minHeight: 40, display: 'inline-flex', alignItems: 'center', padding: '0 16px', borderRadius: 20, border: '1px solid var(--line2)', background: x === topic ? 'var(--teal)' : 'var(--panel2)', color: x === topic ? '#0B1B33' : 'var(--muted)', fontWeight: 600, fontSize: 13 }}>{x}</Link>)}
        </nav>
        {!list.length && <p className="muted" style={{ margin: 0 }}>No published briefs on {topic} yet. Showing the latest brief.</p>}
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
            {top.id === 'sample' && (() => { const v = LIBRARY.find((x) => x.id === 'nvda-story')!; return <section className="card"><h2 style={{ marginBottom: 10 }}>Watch: the full story</h2><Reel url={v.url} title={v.title} /></section>; })()}
            <section className="card">
              <h2 style={{ marginBottom: 8 }}>Policy tracker</h2>
              {rest.length ? rest.map((b) => (
                <div key={b.id} style={{ padding: '12px 0', borderTop: '1px solid var(--line)' }}><div className="tag gold">{b.tag}</div><div style={{ fontWeight: 600, color: '#fff' }}>{b.title}</div><div className="muted" style={{ fontSize: 12 }}>{b.money}</div></div>
              )) : <p className="muted" style={{ margin: 0 }}>New briefs appear here after editorial and guardrail review.</p>}
            </section>
            <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><h2>Read it from your country</h2><p className="muted" style={{ margin: 0 }}>Each brief has a US lens and an India lens: the same event, explained for your currency, taxes and markets. Ask the agent below for your country’s view.</p></section>
            <AgentAsk title="Ask the world & policy agent" suggestions={['What would new US tariffs mean for prices in India?', 'How do sanctions affect oil prices?']} />
          </aside>
        </div>
        <Footer note="Briefs pass the guardrail agent and a human editor: sources on every claim, both sides, no endorsements" />
      </main>
    </>
  );
}
