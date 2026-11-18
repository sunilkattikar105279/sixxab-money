import type { Metadata } from 'next';
import Link from 'next/link';
import { Header, Footer } from '@/components/Header';
import { StagesPyramid } from '@/components/StagesPyramid';
import { StageQuiz } from '@/components/StageQuiz';
import { JourneyPath } from '@/components/JourneyPath';
import { STAGES } from '@/lib/sixs';
import { trackFor } from '@/lib/curriculum';

export const metadata: Metadata = { title: 'SIXXAB Stages: six money stages from age 11 · SIXXAB Money', description: 'Find your money stage in three questions and get a free 12-week learning track, from first pocket money to legacy.' };

export default function Stages() {
  return (
    <>
      <Header active="Stages" />
      <main className="wrap" id="main">
        <section className="card">
          <div className="tag teal">SIXXAB Stages</div>
          <h1 style={{ fontSize: 28, margin: '6px 0' }}>Six money stages, starting at age 11</h1>
          <p className="muted" style={{ margin: 0 }}>Every stage has one focus and one gate. You climb by building habits and net worth, not by age. Each stage comes with a 12-week track: understand, practise, prove.</p>
          <StagesPyramid />
        </section>
        <JourneyPath />
        <StageQuiz />
        <section className="grid" aria-label="Stage tracks">
          {STAGES.map((s) => {
            const t = trackFor(s.n);
            return (
              <article key={s.key} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="tag gold">Stage {s.n} · {s.name} · {s.n === 6 ? '65+' : `age ${t.ages}`}</div>
                <p style={{ margin: 0 }}>{s.focus}</p>
                <p className="dim" style={{ margin: 0, fontSize: 13 }}>Gate: {s.habitGate}</p>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>{t.lessons.slice(0, 3).map((l) => <li key={l.week}>Week {l.week}: {l.title}</li>)}</ul>
                <Link href="/login?join=1" className="dim" style={{ fontSize: 13 }}>+ 9 more weeks for members (free)</Link>
              </article>
            );
          })}
        </section>
        <Footer note="Education, not advice · Members under 18 join through a parent account" />
      </main>
    </>
  );
}
