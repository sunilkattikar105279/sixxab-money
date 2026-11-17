import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Header, Footer } from '@/components/Header';
import { AgentAsk } from '@/components/AgentAsk';
import { bestRoute, isQuestion, search } from '@/lib/search';

export default async function Ask({ searchParams }: { searchParams: Promise<{ q?: string; ask?: string }> }) {
  const { q, ask } = await searchParams;
  const query = (q ?? '').trim().slice(0, 300);
  // A plain ticker, company, country or topic goes straight to its page; ?ask=1 forces the agent.
  if (query && !ask) { const to = bestRoute(query); if (to) redirect(to); }
  const hits = query ? search(query) : [];
  return (
    <>
      <Header active="" />
      <main className="wrap" id="main">
        {hits.length > 0 && (
          <section className="card" aria-label="Search results">
            <h2 style={{ marginBottom: 8 }}>Results for “{query}”</h2>
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
              {hits.map((h) => (
                <li key={h.href}><Link href={h.href} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 12px', border: '1px solid var(--line2)', borderRadius: 10 }}>
                  <span><span className="tag dim" style={{ marginRight: 8 }}>{h.kind}</span>{h.label}</span>{h.hint && <span className="dim" style={{ fontSize: 13 }}>{h.hint}</span>}
                </Link></li>
              ))}
            </ul>
            <p className="dim" style={{ margin: '8px 0 0', fontSize: 13 }}>Or ask the coach below.</p>
          </section>
        )}
        <AgentAsk title="Ask SIXXAB Money" initial={query || undefined} autoRun={!!query && (isQuestion(query) || !!ask || hits.length === 0)} suggestions={['Why did the market move today?', 'What does a Fed rate cut mean for my mortgage?', 'Explain an index fund like I’m 12']} />
        <Footer note="Answers pass the guardrail agent: sources, both sides on politics, no buy/sell calls" />
      </main>
    </>
  );
}
