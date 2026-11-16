'use client';
import { useState } from 'react';
import { GOALS, STARTER_PLANS } from '@/lib/growth';

interface Goal { goal: string; how: string; done: boolean }

/** 90-day plan goals that the member can tick off; saved when signed in. */
export function PlanList({ initial, canSave }: { initial: Goal[]; canSave: boolean }) {
  const [goals, setGoals] = useState(initial);
  const [saving, setSaving] = useState(false);

  const [draft, setDraft] = useState('');

  async function save(next: Goal[]) {
    setGoals(next);
    if (!canSave) return;
    setSaving(true);
    await fetch('/api/plan', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ goals: next }) }).catch(() => null);
    setSaving(false);
  }
  const toggle = (i: number) => save(goals.map((g, k) => (k === i ? { ...g, done: !g.done } : g)));
  const remove = (i: number) => save(goals.filter((_, k) => k !== i));
  const add = (e: React.FormEvent) => { e.preventDefault(); const t = draft.trim(); if (!t || goals.length >= 10) return; setDraft(''); save([...goals, { goal: t.slice(0, 200), how: 'Your own goal', done: false }]); };

  if (!goals.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p className="muted" style={{ margin: 0 }}>Pick a focus and we will start a 3-step, 90-day plan you can edit.</p>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 8 }}>
          {GOALS.map((g) => <button key={g.id} type="button" className="inset" style={{ textAlign: 'left', border: '1px solid var(--line2)', color: 'var(--teal)', cursor: 'pointer', minHeight: 44, font: 'inherit' }} onClick={() => save(STARTER_PLANS[g.id])}>{g.label}</button>)}
        </div>
      </div>
    );
  }
  const done = goals.filter((g) => g.done).length;
  return (
    <>
      <div className="dim" style={{ fontSize: 12, marginBottom: 8 }}>{done} of {goals.length} done{saving ? ' · saving…' : canSave ? '' : ' · sign in to save'}</div>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {goals.map((g, i) => (
          <li key={g.goal} className="inset" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <button type="button" onClick={() => toggle(i)} aria-pressed={g.done} aria-label={`Mark "${g.goal}" ${g.done ? 'not done' : 'done'}`} style={{ flex: 'none', width: 44, height: 44, borderRadius: 10, border: `2px solid ${g.done ? 'var(--teal)' : 'var(--line2)'}`, background: g.done ? 'var(--teal)' : 'transparent', color: '#0B1B33', font: '800 18px Inter', cursor: 'pointer' }}>{g.done ? '✓' : ''}</button>
            <div style={{ flex: 1 }}><div style={{ fontWeight: 600, color: '#fff', textDecoration: g.done ? 'line-through' : 'none' }}>{g.goal}</div><div className="muted" style={{ fontSize: 13 }}>{g.how}</div></div>
            {canSave && <button type="button" onClick={() => remove(i)} aria-label={`Remove "${g.goal}"`} style={{ background: 'none', border: 0, color: 'var(--dim)', cursor: 'pointer', minWidth: 32, minHeight: 32 }}>×</button>}
          </li>
        ))}
      </ol>
      {canSave && goals.length < 10 && (
        <form onSubmit={add} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <label className="sr" htmlFor="new-goal">Add a goal</label>
          <input id="new-goal" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add your own goal" maxLength={200} />
          <button className="btn btn-line" type="submit">Add</button>
        </form>
      )}
    </>
  );
}
