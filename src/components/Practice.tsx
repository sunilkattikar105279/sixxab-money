import Link from 'next/link';
import type { ModelMarket, MarketModels, Model } from '@/lib/models';

export const PRACTICE_PAGES = [
  { href: '/practice/models', label: 'Model portfolios' },
  { href: '/practice/paper', label: 'Paper portfolio' },
  { href: '/practice/goals', label: 'Goals & risk' },
] as const;

/** Sub-navigation plus market switch shared by the practice pages. */
export function PracticeNav({ current, market }: { current: string; market: ModelMarket }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
      <nav className="seg" aria-label="Practice pages">
        {PRACTICE_PAGES.map((p) => <Link key={p.href} href={`${p.href}?m=${market}`} aria-current={p.href === current ? 'true' : undefined}>{p.label}</Link>)}
      </nav>
      <nav className="seg" aria-label="Market">
        {(['US', 'IN', 'GLOBAL'] as const).map((m) => <Link key={m} href={`${current}?m=${m}`} aria-current={m === market ? 'true' : undefined}>{m === 'IN' ? 'India' : m === 'GLOBAL' ? 'Global' : 'US'}</Link>)}
      </nav>
    </div>
  );
}

export function EducationBar({ children }: { children: React.ReactNode }) {
  return (
    <section className="bar">
      <span className="tag gold">Practice · Education only</span>
      <span style={{ flex: '1 1 480px' }}>{children} Nothing here is a recommendation for you, and no real money moves. Educational, not financial advice.</span>
    </section>
  );
}

/** Stacked allocation bar with a legend. */
export function MixBar({ set, model, height = 14 }: { set: MarketModels; model: Pick<Model, 'weights'>; height?: number }) {
  const parts = set.assets.filter((a) => (model.weights[a.key] ?? 0) > 0);
  const total = parts.reduce((s, a) => s + model.weights[a.key], 0) || 1;
  return (
    <div>
      <div role="img" aria-label={parts.map((a) => `${a.label} ${Math.round(100 * model.weights[a.key] / total)}%`).join(', ')} style={{ display: 'flex', height, borderRadius: height / 2, overflow: 'hidden', background: 'var(--line)' }}>
        {parts.map((a) => <div key={a.key} style={{ width: `${100 * model.weights[a.key] / total}%`, background: a.color }} />)}
      </div>
      <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 13 }}>
        {parts.map((a) => <li key={a.key}><span aria-hidden style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: a.color, marginRight: 6 }} />{a.label} <b className="mono" style={{ color: '#fff' }}>{Math.round(100 * model.weights[a.key] / total)}%</b></li>)}
      </ul>
    </div>
  );
}

export const pct = (x: number, digits = 0) => `${x >= 0 ? '+' : ''}${(100 * x).toFixed(digits)}%`;
export const monthYear = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
