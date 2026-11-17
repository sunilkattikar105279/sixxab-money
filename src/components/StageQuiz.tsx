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
      {!compact && <><h2 style={{ margin: 0 }}>Find your stage in 3 questions</h2><p className="muted" style={{ margin: 0 }}>No sign-up needed. Your answers stay on this device until you join.</p></>}
      {!compact && <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={teen} onChange={(e) => setTeen(e.target.checked)} style={{ width: 18, minHeight: 18 }} /> I&apos;m under 18</label>}
      {QUIZ.map((q) => (
        <fieldset key={q.key} style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ marginBottom: 6, fontWeight: 600 }}>{q.q}</legend>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {q.options.map((o) => (
              <label key={o.value} className="inset" style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 44, cursor: 'pointer', border: `1px solid ${a[q.key] === o.value ? 'var(--teal)' : 'var(--line2)'}` }}>
                <input type="radio" name={`quiz-${q.key}`} value={o.value} checked={a[q.key] === o.value} onChange={() => pick(q.key, o.value)} style={{ width: 18, minHeight: 18 }} /> {o.label}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
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
