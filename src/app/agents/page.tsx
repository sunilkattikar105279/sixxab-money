import type { Metadata } from 'next';
import Link from 'next/link';
import { Header, Footer } from '@/components/Header';
import { TEAM, POWERED_BY } from '@/lib/agents/team';

export const metadata: Metadata = { title: 'Meet the agents · SIXXAB Money', description: 'Quant, Sigma, Pulse, Delta, Pivot, Moat and the rest of the SIXXAB Money agent team, and how they work together.' };

const GROUPS: { title: string; keys: string[] }[] = [
  { title: 'Market analysis', keys: ['quant', 'sigma', 'pulse', 'delta', 'pivot', 'moat'] },
  { title: 'Briefs and context', keys: ['tape', 'macro', 'geo', 'epoch'] },
  { title: 'Your money journey', keys: ['mentor', 'basis'] },
  { title: 'Safety', keys: ['audit'] },
];

export default function Agents() {
  return (
    <>
      <Header active="" />
      <main className="wrap" id="main">
        <section className="card">
          <div className="tag teal">The SIXXAB Money agent team</div>
          <h1 style={{ fontSize: 28, margin: '6px 0' }}>Thirteen specialist agents, one coach</h1>
          <p className="muted" style={{ margin: 0 }}>Ask a question or open a page and an orchestrator routes it to the right specialist. Each agent is named after the financial idea it works with, and every answer passes Audit before you see it. All {POWERED_BY}.</p>
          <svg viewBox="0 0 760 210" width="100%" role="img" aria-label="You ask, the orchestrator routes to specialist agents, Audit checks the answer, you get it" style={{ marginTop: 12 }}>
            {[['You ask', 20], ['Orchestrator', 170], ['Specialist agents', 330], ['Audit', 500], ['Your answer', 630]].map(([t, x], i) => (
              <g key={String(t)}>
                <rect x={Number(x)} y={80} width={i === 2 ? 150 : 120} height={50} rx={10} fill={i === 4 ? 'var(--gold)' : 'var(--panel2)'} fillOpacity={i === 4 ? 0.2 : 1} stroke={i === 4 ? 'var(--gold)' : 'var(--line2)'} />
                <text x={Number(x) + (i === 2 ? 75 : 60)} y={110} textAnchor="middle" fontSize={14} fontWeight={600} fill="#fff">{t}</text>
              </g>
            ))}
            {[[140, 170], [290, 330], [480, 500], [620, 630]].map(([a, b]) => <path key={a} d={`M${a} 105 H${b - 4}`} stroke="var(--teal)" strokeWidth={1.5} markerEnd="url(#ag-arrow)" />)}
            <defs><marker id="ag-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--teal)" /></marker></defs>
            <text x={405} y={60} textAnchor="middle" fontSize={11.5} fill="var(--muted)">Quant · Sigma · Pulse · Delta · Pivot · Moat</text>
            <text x={405} y={155} textAnchor="middle" fontSize={11.5} fill="var(--muted)">Tape · Macro · Geo · Epoch · Mentor · Basis</text>
            <text x={560} y={175} textAnchor="middle" fontSize={11.5} fill="var(--muted)">sources, balance, no buy/sell calls</text>
          </svg>
        </section>
        {GROUPS.map((g) => (
          <section key={g.title} aria-label={g.title}>
            <h2 style={{ margin: '8px 0' }}>{g.title}</h2>
            <div className="grid">
              {TEAM.filter((a) => g.keys.includes(a.key)).map((a) => (
                <article key={a.key} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ font: '700 24px var(--head)', color: 'var(--gold)' }}>{a.name}</span><span className="tag dim">{a.role}</span></div>
                  <p className="dim" style={{ margin: 0, fontSize: 13, fontStyle: 'italic' }}>{a.term}</p>
                  <p style={{ margin: 0, fontSize: 14 }}>{a.does}</p>
                  {a.href && <Link href={a.href} style={{ fontSize: 14 }}>Open {a.name} →</Link>}
                </article>
              ))}
            </div>
          </section>
        ))}
        <Footer note="Agents give education and scenarios, never personal buy or sell advice" />
      </main>
    </>
  );
}
