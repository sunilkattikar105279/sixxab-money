import type { Metadata } from 'next';
import Link from 'next/link';
import { Header, Footer } from '@/components/Header';
import { StagesPyramid } from '@/components/StagesPyramid';
import { StageQuiz } from '@/components/StageQuiz';
import { JourneyPath, STAGE_COACH } from '@/components/JourneyPath';
import { StageIcon } from '@/components/StageIcon';
import { STAGES } from '@/lib/sixs';
import { trackFor } from '@/lib/curriculum';

export const metadata: Metadata = { title: 'Your SIXXAB Journey: six money stages from age 11 · SIXXAB Money', description: 'Find your money stage in three questions and get a free 12-week learning track, from first pocket money to legacy.' };

export default function Journey() {
  return (
    <>
      <Header active="Journey" />
      <main className="wrap" id="main">
        <section className="card journey-intro">
          <div>
            <div className="tag teal">SIXXAB Journey</div>
            <h1 style={{ fontSize: 30, margin: '8px 0' }}>Six money stages, starting at age 11</h1>
            <p className="muted" style={{ margin: 0, maxWidth: 720 }}>Every stage has one focus and two gates: a habit and a net-worth level. You climb by building habits and savings, not by age. Each stage comes with a 12-week track in three parts: understand, practise, prove.</p>
          </div>
          <StagesPyramid />
        </section>

        <JourneyPath />

        <StageQuiz />

        <section aria-label="12-week tracks">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, margin: '4px 0 12px' }}>
            <h2 style={{ margin: 0 }}>Your 12-week track at every stage</h2>
            <span className="dim" style={{ fontSize: 13 }}>First 3 weeks free to preview · 9 more weeks for members (free)</span>
          </div>
          <div className="track-grid">
            {STAGES.map((s) => {
              const t = trackFor(s.n);
              return (
                <article key={s.key} className="card track-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <StageIcon n={s.n} size={34} />
                    <div><div className="tag gold">Stage {s.n} · {STAGE_COACH[s.n].age}</div><h3 style={{ margin: '2px 0 0' }}>{s.n}. {s.name}</h3></div>
                  </div>
                  <p style={{ margin: 0 }}>{s.focus}</p>
                  <p className="dim" style={{ margin: 0, fontSize: 13 }}><b>Gate:</b> {s.habitGate}</p>
                  <ol className="week-list">{t.lessons.slice(0, 3).map((l) => <li key={l.week}><span className="wk">Week {l.week}</span>{l.title}</li>)}</ol>
                  <Link href="/login?join=1" className="btn btn-line" style={{ marginTop: 'auto', alignSelf: 'flex-start' }}>+ 9 more weeks (free for members)</Link>
                </article>
              );
            })}
          </div>
        </section>
        <Footer note="Education, not advice · Members under 18 join through a parent account" />
      </main>
    </>
  );
}
