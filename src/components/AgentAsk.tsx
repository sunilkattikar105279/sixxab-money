'use client';
import { useState } from 'react';
import { Reel } from './Reel';
import { JoinButton } from './JoinButton';
import { track } from '@/lib/track';

interface Answer { answer: string; domain: string; consulted?: string | null; sources: { name: string; asOf?: string }[]; confidence?: string; ledgerId?: string | null; videos?: { title: string; url: string }[]; error?: string }

export function AgentAsk({ title, suggestions, initial }: { title: string; suggestions: string[]; initial?: string }) {
  const [q, setQ] = useState(initial ?? '');
  const [busy, setBusy] = useState(false);
  const [a, setA] = useState<Answer | null>(null);
  const [rated, setRated] = useState<string | null>(null);

  async function rate(r: 'up' | 'down') {
    if (!a?.ledgerId) return; setRated(r);
    await fetch('/api/feedback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ledgerId: a.ledgerId, rating: r }) }).catch(() => null);
  }

  async function send(question: string) {
    if (question.trim().length < 2) return;
    setBusy(true); setA(null); setRated(null);
    try {
      const res = await fetch('/api/agent', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question }) });
      const j = await res.json();
      setA(j);
      if (res.ok) track('question_asked', { page: location.pathname });
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
          {a.error ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
              <p className="red" style={{ margin: 0 }}>{a.error}</p>
              {a.error.includes('Sign in') && <JoinButton label="Join free to keep asking" from="agent_limit" />}
            </div>
          ) : (
            <>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{a.answer}</p>
              <p className="dim" style={{ margin: '8px 0 0', fontSize: 12 }}>
                Agent: {a.domain}{a.consulted ? ` + ${a.consulted}` : ''}{a.confidence ? ` · confidence ${a.confidence}` : ''} · Sources: {a.sources.length ? a.sources.map((s) => s.name + (s.asOf ? ` (${s.asOf})` : '')).join('; ') : 'none used'}
                {a.ledgerId ? ` · trail #${a.ledgerId.slice(0, 8)}` : ''}
              </p>
              {a.videos && a.videos.length > 0 && <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>{a.videos.map((v) => <Reel key={v.url} url={v.url} title={v.title} compact />)}</div>}
              {a.ledgerId && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, fontSize: 12 }} className="dim">
                  Was this helpful?
                  <button type="button" aria-label="Helpful" aria-pressed={rated === 'up'} onClick={() => rate('up')} style={{ minWidth: 44, minHeight: 36, borderRadius: 8, border: '1px solid var(--line2)', background: rated === 'up' ? 'var(--teal)' : 'transparent', color: rated === 'up' ? '#0B1B33' : 'var(--text)', cursor: 'pointer' }}>Yes</button>
                  <button type="button" aria-label="Not helpful" aria-pressed={rated === 'down'} onClick={() => rate('down')} style={{ minWidth: 44, minHeight: 36, borderRadius: 8, border: '1px solid var(--line2)', background: rated === 'down' ? 'var(--red)' : 'transparent', color: rated === 'down' ? '#0B1B33' : 'var(--text)', cursor: 'pointer' }}>No</button>
                  {rated && <span>Thanks: feedback goes to the learning review, not straight into the agent.</span>}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
