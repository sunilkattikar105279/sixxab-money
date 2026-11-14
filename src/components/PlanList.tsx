'use client';
import { useState } from 'react';

interface Goal { goal: string; how: string; done: boolean }

/** 90-day plan goals that the member can tick off; saved when signed in. */
export function PlanList({ initial, canSave }: { initial: Goal[]; canSave: boolean }) {
  const [goals, setGoals] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function toggle(i: number) {
    const next = goals.map((g, k) => (k === i ? { ...g, done: !g.done } : g));
    setGoals(next);
    if (!canSave) return;
    setSaving(true);
    await fetch('/api/plan', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ goals: next }) }).catch(() => null);
    setSaving(false);
  }

  if (!goals.length) return <p className="muted">Your coach drafts a plan after your first check-in.</p>;
  const done = goals.filter((g) => g.done).length;
  return (
    <>
      <div className="dim" style={{ fontSize: 12, marginBottom: 8 }}>{done} of {goals.length} done{saving ? ' · saving…' : canSave ? '' : ' · sign in to save'}</div>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {goals.map((g, i) => (
          <li key={g.goal} className="inset" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <button type="button" onClick={() => toggle(i)} aria-pressed={g.done} aria-label={`Mark "${g.goal}" ${g.done ? 'not done' : 'done'}`} style={{ flex: 'none', width: 44, height: 44, borderRadius: 10, border: `2px solid ${g.done ? 'var(--teal)' : 'var(--line2)'}`, background: g.done ? 'var(--teal)' : 'transparent', color: '#0B1B33', font: '800 18px Inter', cursor: 'pointer' }}>{g.done ? '✓' : ''}</button>
            <div><div style={{ fontWeight: 600, color: '#fff', textDecoration: g.done ? 'line-through' : 'none' }}>{g.goal}</div><div className="muted" style={{ fontSize: 13 }}>{g.how}</div></div>
          </li>
        ))}
      </ol>
    </>
  );
}
