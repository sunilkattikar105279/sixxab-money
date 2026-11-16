'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CheckinForm({ habit, currency, initialNetWorth, initialHabit, fromManage }: { habit: string; currency: string; initialNetWorth: number; initialHabit: boolean | null; fromManage: boolean }) {
  const router = useRouter();
  const [habitMet, setHabitMet] = useState<boolean | null>(initialHabit);
  const [nw, setNw] = useState(String(initialNetWorth));
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (habitMet === null) return setMsg('Answer the habit question first.');
    setBusy(true); setMsg(null);
    const r = await fetch('/api/checks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ habitMet, netWorth: Number(nw) || 0 }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (!r?.ok) return setMsg(j.error ?? 'Could not save. Try again.');
    setMsg('Saved. See you next month!');
    router.refresh();
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ marginBottom: 6 }}>1. This month, did you keep your stage habit? <span className="muted">“{habit}”</span></legend>
        <div style={{ display: 'flex', gap: 8 }}>
          {[true, false].map((v) => (
            <label key={String(v)} className="inset" style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center', minHeight: 44, cursor: 'pointer', border: `1px solid ${habitMet === v ? 'var(--teal)' : 'var(--line2)'}` }}>
              <input type="radio" name="habit" checked={habitMet === v} onChange={() => setHabitMet(v)} style={{ width: 18, minHeight: 18 }} /> {v ? 'Yes, I kept it' : 'Not this month'}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="nw">2. Your net worth today ({currency}) <span className="dim">· what you own minus what you owe</span></label>
        <input id="nw" inputMode="decimal" value={nw} onChange={(e) => setNw(e.target.value.replace(/[^0-9.-]/g, ''))} style={{ marginTop: 6 }} />
        {fromManage && <p className="dim" style={{ margin: '4px 0 0', fontSize: 12 }}>Filled in from Manage money. Update it there to keep it accurate.</p>}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-gold" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save check-in'}</button>
        {msg && <span role="status" className="muted">{msg}</span>}
      </div>
    </form>
  );
}

export function PromoteButton({ ready, nextName }: { ready: boolean; nextName: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setMsg(null);
    const r = await fetch('/api/stage', { method: 'POST' }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (!r?.ok) return setMsg(j.error ?? 'Not yet.');
    setMsg(`Congratulations, welcome to ${nextName}!`);
    router.refresh();
  }
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <button type="button" className={`btn ${ready ? 'btn-gold' : 'btn-line'}`} disabled={!ready || busy} onClick={go}>{ready ? `Move up to ${nextName}` : `Move up unlocks after 3 months`}</button>
      {msg && <span role="status" className={msg.startsWith('Congrat') ? 'teal' : 'muted'}>{msg}</span>}
    </div>
  );
}
