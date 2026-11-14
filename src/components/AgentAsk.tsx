'use client';
import { useState } from 'react';

interface Answer { answer: string; domain: string; sources: { name: string; asOf?: string }[]; confidence?: string; ledgerId?: string | null; error?: string }

export function AgentAsk({ title, suggestions, initial }: { title: string; suggestions: string[]; initial?: string }) {
  const [q, setQ] = useState(initial ?? '');
  const [busy, setBusy] = useState(false);
  const [a, setA] = useState<Answer | null>(null);

  async function send(question: string) {
    if (question.trim().length < 2) return;
    setBusy(true); setA(null);
    try {
      const res = await fetch('/api/agent', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question }) });
      setA(await res.json());
    } catch {
      setA({ answer: '', domain: '', sources: [], error: 'Network error. Try again.' });
    } finally { setBusy(false); }
  }

  return (
    <section className="card" aria-label={title} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h2>{title}</h2>
      {suggestions.map((s) => (
        <button key={s} type="button" className="inset" style={{ textAlign: 'left', border: '1px solid var(--line2)', color: 'var(--teal)', cursor: 'pointer', minHeight: 44, font: 'inherit' }} onClick={() => { setQ(s); send(s); }}>{s}</button>
      ))}
      <form onSubmit={(e) => { e.preventDefault(); send(q); }} style={{ display: 'flex', gap: 8 }}>
        <label className="sr" htmlFor={`ask-${title}`}>Your question</label>
        <input id={`ask-${title}`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a question" />
        <button className="btn btn-gold" type="submit" disabled={busy}>{busy ? 'Thinking…' : 'Ask'}</button>
      </form>
      {a && (
        <div className="inset" role="status">
          {a.error ? <p className="red" style={{ margin: 0 }}>{a.error}</p> : (
            <>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{a.answer}</p>
              <p className="dim" style={{ margin: '8px 0 0', fontSize: 12 }}>
                Agent: {a.domain}{a.confidence ? ` · confidence ${a.confidence}` : ''} · Sources: {a.sources.length ? a.sources.map((s) => s.name + (s.asOf ? ` (${s.asOf})` : '')).join('; ') : 'none used'}
                {a.ledgerId ? ` · trail #${a.ledgerId.slice(0, 8)}` : ''}
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
