import Link from 'next/link';

/** Shown where member-only detail would be: says what joining unlocks, never a dead end. */
export function JoinPrompt({ what, from }: { what: string; from: string }) {
  return (
    <div className="inset" style={{ border: '1px dashed var(--gold)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 14 }}>🔒 {what}</span>
      <Link className="btn btn-gold" href={`/login?join=1&next=${encodeURIComponent(from)}`} style={{ minHeight: 36 }}>See your next step, join free</Link>
    </div>
  );
}
