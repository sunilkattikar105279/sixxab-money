import { Header, Footer } from '@/components/Header';
import { AgentAsk } from '@/components/AgentAsk';
import { getIndicator, INDICATORS } from '@/lib/data/fred';
import { VideoRail } from '@/components/VideoRail';
import { videos } from '@/lib/media';

export const revalidate = 3600;

const MEANS: Record<string, string> = {
  fed_funds: 'Sets the cost of loans, cards and savings yields.',
  cpi: 'How fast prices rise; compare with your raise and savings rate.',
  unemployment: 'Job-market health; a cue to check your emergency fund.',
  ten_year: 'Drives mortgage rates.',
  mortgage_30y: 'What a new home loan costs.',
  gdp_growth: 'Overall pace of the economy.',
};

const INDIA = [
  ['RBI', 'Repo rate', 'Sets home-loan and FD rates.'], ['MOSPI', 'CPI inflation', 'Compare with your FD and salary hike.'], ['RBI', 'USD/INR', 'Affects fuel, gadgets and US tuition.'],
];

export default async function Economy() {
  const [values, clips] = await Promise.all([Promise.all(Object.keys(INDICATORS).map((k) => getIndicator(k))), videos({ topic: 'economy', limit: 4 })]);
  return (
    <>
      <Header active="Economy" />
      <main className="wrap">
        <section className="bar"><span className="tag teal">Economy agent</span><span style={{ flex: '1 1 480px' }}>Each indicator shows its latest value, source and date, and what it means for your money.</span></section>
        <h2>United States</h2>
        <section className="grid" aria-label="US indicators">
          {Object.entries(INDICATORS).map(([key, meta], i) => {
            const v = values[i];
            return (
              <article key={key} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="tag dim">FRED {meta.seriesId}{v ? ` · ${v.date}` : ''}</div>
                <h2>{meta.label}</h2>
                <div className="big">{v ? `${v.value.toLocaleString('en-US', { maximumFractionDigits: 2 })}${meta.units === '%' ? '%' : ''}` : '—'}</div>
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>{MEANS[key]}</p>
              </article>
            );
          })}
        </section>
        <h2>India</h2>
        <section className="grid" aria-label="India indicators">
          {INDIA.map(([src, name, means]) => (
            <article key={name} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="tag dim">{src}</div><h2>{name}</h2><div className="big">—</div>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>{means} Connector in progress.</p>
            </article>
          ))}
        </section>
        <VideoRail title="Economy explained in 60 seconds" items={clips} />
        <AgentAsk title="Ask the economy agent" suggestions={['What does a Fed cut mean for my mortgage?', 'How does an RBI repo-rate change affect my home loan EMI?', 'Is inflation eating my fixed deposit?']} />
        <Footer note="US data: FRED (Federal Reserve Bank of St. Louis) · India: RBI and MOSPI connectors in progress" />
      </main>
    </>
  );
}
