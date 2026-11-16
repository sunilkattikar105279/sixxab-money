import { Header, Footer } from '@/components/Header';
import { AgentAsk } from '@/components/AgentAsk';

export default async function Ask({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return (
    <>
      <Header active="" />
      <main className="wrap" id="main">
        <AgentAsk title="Ask SIXXAB Money" initial={q} suggestions={['Why did the market move today?', 'What does a Fed rate cut mean for my mortgage?', 'Explain an index fund like I’m 12']} />
        <Footer note="Answers pass the guardrail agent: sources, both sides on politics, no buy/sell calls" />
      </main>
    </>
  );
}
