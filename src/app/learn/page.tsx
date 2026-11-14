import { Header, Footer } from '@/components/Header';
import { AgentAsk } from '@/components/AgentAsk';
import { STAGES } from '@/lib/sixs';
import { StageIcon } from '@/components/StageIcon';
import { VideoRail } from '@/components/VideoRail';
import { videos } from '@/lib/media';

// Starter curriculum: three lessons per stage. India lessons avoid live stock prices (SEBI 30-day rule for education).
const LESSONS: Record<string, string[]> = {
  startup: ['Needs vs wants', 'Your first savings goal', 'Where money comes from'],
  struggle: ['Build a simple budget', 'Good debt, bad debt', 'Your first bank account'],
  scale: ['Emergency fund: how much?', 'What an index fund is', 'Compounding in plain words'],
  success: ['Savings rate and freedom', 'Insurance basics', 'Taxes: US and India'],
  significance: ['Giving with a plan', 'Mentoring someone with money', 'Protecting wealth'],
  sixxab: ['Estate planning basics', 'Community funds', 'Leading with money'],
};

export default async function Learn() {
  const [habits, investing] = await Promise.all([videos({ topic: 'habits', limit: 8 }), videos({ topic: 'investing', limit: 6 })]);
  return (
    <>
      <Header active="Learn" />
      <main className="wrap">
        <section className="bar"><span className="tag teal">Tutor agent</span><span style={{ flex: '1 1 480px' }}>Short lessons matched to your age and stage. Each ends with one question to check you got it.</span></section>
        <section className="grid">
          {STAGES.map((s) => (
            <article key={s.key} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><StageIcon n={s.n} /><div className="tag gold">Stage {s.n} · {s.name}</div></div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>{LESSONS[s.key].map((l) => <li key={l}>{l}</li>)}</ul>
            </article>
          ))}
        </section>
        <VideoRail title="Money habits (stages 1–3)" items={habits} />
        <VideoRail title="Investing basics (stages 3–4)" items={investing} />
        <AgentAsk title="Ask the tutor" suggestions={['Explain compounding like I’m 12', 'What is inflation?', 'What is a SIP?']} />
        <Footer note="Lessons are education, not advice · India lessons use no stock price data from the last 30 days" />
      </main>
    </>
  );
}
