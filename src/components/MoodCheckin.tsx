'use client';
import { useState } from 'react';

const FACES = [
  [1, 'Very stressed'], [2, 'Worried'], [3, 'Okay'], [4, 'Good'], [5, 'Confident'],
] as const;

export function MoodCheckin() {
  const [mood, setMood] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function pick(m: number) {
    setMood(m);
    const res = await fetch('/api/checkin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mood: m }) }).catch(() => null);
    const json = res ? await res.json().catch(() => null) : null;
    setMsg(json?.message ?? 'Thanks for checking in.');
  }

  return (
    <section className="card" aria-label="Money mood check-in" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h2>How do you feel about money today?</h2>
      <div role="group" aria-label="Money mood" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {FACES.map(([m, label]) => (
          <button key={m} type="button" onClick={() => pick(m)} aria-pressed={mood === m} className="inset" style={{ minHeight: 44, border: `1px solid ${mood === m ? 'var(--teal)' : 'var(--line2)'}`, color: 'var(--text)', cursor: 'pointer', font: 'inherit', flex: '1 1 90px' }}>{label}</button>
        ))}
      </div>
      {msg && <p className="muted" role="status" style={{ margin: 0 }}>{msg}</p>}
      <p className="dim" style={{ margin: 0, fontSize: 12 }}>Optional. Only your coach uses it to adjust tone, and you can delete it any time.</p>
    </section>
  );
}
