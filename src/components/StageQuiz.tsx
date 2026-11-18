'use client';
import { useState } from 'react';
import Link from 'next/link';
import { QUIZ, placeStage, trackFor, type QuizAnswers } from '@/lib/curriculum';
import { STAGES } from '@/lib/sixs';
import { track } from '@/lib/track';

/** Three questions, an instant stage, and a reason to join: the first weeks of your track. */
export function StageQuiz({ onResult, compact = false, initial }: { onResult?: (stage: number, a: QuizAnswers) => void; compact?: boolean; initial?: Partial<QuizAnswers> }) {
  const [a, setA] = useState<Partial<QuizAnswers>>(initial ?? {});
  const [teen, setTeen] = useState(false);
  const done = QUIZ.every((q) => a[q.key]);
  const stage = done ? placeStage(a as QuizAnswers, teen ? 15 : null) : null;
  const s = stage ? STAGES.find((x) => x.n === stage)! : null;
  function pick(k: keyof QuizAnswers, v: string) {
    const next = { ...a, [k]: v } as Partial<QuizAnswers>;
    setA(next);
    if (QUIZ.every((q) => next[q.key])) {
      const st = placeStage(next as QuizAnswers, teen ? 15 : null);
      try { localStorage.setItem('sixxab_quiz', JSON.stringify(next)); } catch { /* storage off */ }
      track('stage_quiz_done', { stage: st });
      onResult?.(st, next as QuizAnswers);
    }
  }
  return (
    <section className={compact ? '' : 'card'} aria-label="Find your stage" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!compact && (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <div><h2 style={{ margin: 0 }}>Find your stage in 3 questions</h2><p className="muted" style={{ margin: '4px 0 0' }}>No sign-up needed. Your answers stay on this device until you join.</p></div>
          <label className="quiz-teen"><input type="checkbox" checked={teen} onChange={(e) => setTeen(e.target.checked)} /> I&apos;m under 18</label>
        </div>
      )}
      <div className="quiz-grid">
        {QUIZ.map((q, qi) => (
          <fieldset key={q.key} className="quiz-q">
            <legend><span className="quiz-n">{qi + 1}</span>{q.q}</legend>
            <div className="quiz-opts">
              {q.options.map((o) => (
                <label key={o.value} className={`quiz-opt${a[q.key] === o.value ? ' on' : ''}`}>
                  <input type="radio" name={`quiz-${q.key}`} value={o.value} checked={a[q.key] === o.value} onChange={() => pick(q.key, o.value)} />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      {s && !compact && (
        <div className="inset" role="status" style={{ border: '1px solid var(--gold)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="tag gold">Your stage: {s.n} · {s.name}</div>
          <p style={{ margin: 0 }}>{s.focus}. Your first three weeks:</p>
          <ol style={{ margin: 0, paddingLeft: 20 }}>{trackFor(s.n).lessons.slice(0, 3).map((l) => <li key={l.week}><b>{l.title}</b>: <span className="muted">{l.action}</span></li>)}</ol>
          <Link className="btn btn-gold" href="/login?join=1" style={{ alignSelf: 'flex-start' }} onClick={() => track('join_click', { from: 'stage_quiz' })}>Join free to start your 12-week track</Link>
        </div>
      )}
    </section>
  );
}
