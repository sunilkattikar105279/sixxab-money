import type { Metadata } from 'next';
import Link from 'next/link';
import { Header, Footer } from '@/components/Header';
import { EducationBar } from '@/components/Practice';
import { isModelMarket } from '@/lib/models';

export const metadata: Metadata = { title: 'Practice · Learn to invest without risking money', description: 'Model portfolios for learning, paper portfolios at real prices, and goal planning for the US, India and global markets. Education only.' };

const CARDS = [
  { href: '/practice/models', tag: 'Step 1', title: 'Compare model portfolios', body: 'Five example mixes from calm to volatile, and what each one did over the last five years: growth, worst fall and how long recovery took.' },
  { href: '/practice/goals', tag: 'Step 2', title: 'Plan a goal and know your risk', body: 'Work out the monthly saving a goal needs under returns you choose, and take a six-question risk tolerance check.' },
  { href: '/practice/paper', tag: 'Step 3', title: 'Practise on paper', body: 'Build a mix with pretend money at real end-of-day prices. Add money, watch it move, and practise rebalancing on a rule.' },
];

export default async function Practice({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const sp = await searchParams;
  const market = isModelMarket(sp.m) ? sp.m : 'US';
  return (
    <>
      <Header active="Practice" />
      <main className="wrap" id="main">
        <EducationBar>Practice is where you learn how investing behaves before real money is involved.</EducationBar>
        <section className="card hero">
          <div className="hero-copy">
            <div className="tag teal">SIXXAB Money · Practice</div>
            <h1 style={{ margin: 0, fontSize: 32 }}>Learn to invest without risking a rupee or a dollar</h1>
            <p style={{ margin: 0, fontSize: 17 }}>See how real asset mixes rise and fall, plan your goals, and practise with pretend money until the habits feel natural.</p>
            <nav className="seg" aria-label="Market" style={{ alignSelf: 'flex-start' }}>
              {(['US', 'IN', 'GLOBAL'] as const).map((m) => <Link key={m} href={`/practice?m=${m}`} aria-current={m === market ? 'true' : undefined}>{m === 'IN' ? 'India' : m === 'GLOBAL' ? 'Global' : 'US'}</Link>)}
            </nav>
          </div>
          <div className="hero-meter">
            <div className="tag gold">What Practice is, and isn’t</div>
            <ul className="hero-points" style={{ marginTop: 8 }}>
              <li>Teaching examples and pretend money</li>
              <li>No personal recommendations or buy/sell calls</li>
              <li>No real money, no broker account needed</li>
              <li>Works without signing in; saved in your browser</li>
            </ul>
          </div>
        </section>
        <div className="grid">
          {CARDS.map((c) => (
            <Link key={c.href} href={`${c.href}?m=${market}`} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text)', textDecoration: 'none' }}>
              <span className="tag gold">{c.tag}</span>
              <h2 style={{ margin: 0, fontSize: 20 }}>{c.title}</h2>
              <p className="muted" style={{ margin: 0 }}>{c.body}</p>
              <span className="hub-go">Open →</span>
            </Link>
          ))}
        </div>
        <section className="card">
          <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>Why practise first</h2>
          <p className="muted" style={{ margin: 0 }}>Most investing mistakes are behaviour, not maths: selling in a fall, chasing what just went up, forgetting to rebalance. Practice lets you meet those moments with pretend money. Mentor and the other SIXXAB agents explain what the market is doing while you learn.</p>
        </section>
      </main>
      <Footer note="Practice · Education only, not financial advice" />
    </>
  );
}
