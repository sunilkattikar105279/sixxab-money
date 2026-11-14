import Link from 'next/link';
import { memberClient } from '@/lib/supabase/server';

const TABS = [
  ['Home', '/'], ['Screener', '/screener'], ['Economy', '/economy'], ['World & Policy', '/world'], ['My Money', '/my-money'], ['Learn', '/learn'], ['Levels', '/levels'],
] as const;

export async function Header({ active, market }: { active: string; market?: 'US' | 'IN' | 'GLOBAL' }) {
  const sb = await memberClient();
  const user = sb ? (await sb.auth.getUser()).data.user : null;
  return (
    <header className="top">
      <div className="wrap row">
        <Link href="/" className="logo" aria-label="SIXXAB Money home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sixxab-money-logo.png" alt="SIXXAB Money" />
        </Link>
        <form action="/ask" style={{ flex: '1 1 320px' }}>
          <label className="sr" htmlFor="q">Ask the agent</label>
          <input id="q" name="q" placeholder="Ask SIXXAB Money, or search a ticker, country or policy" />
        </form>
        {market && (
          <nav className="seg" aria-label="Market">
            {(['US', 'IN', 'GLOBAL'] as const).map((m) => (
              <Link key={m} href={`/?m=${m}`} aria-current={m === market ? 'true' : undefined}>{m === 'IN' ? 'India' : m === 'GLOBAL' ? 'Global' : 'US'}</Link>
            ))}
          </nav>
        )}
        {user ? (
          <form action="/auth/signout" method="post" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link href="/my-money" className="btn btn-line">My Money</Link>
            <button className="btn" type="submit" style={{ background: 'transparent', color: 'var(--muted)', border: '1px solid var(--line2)' }}>Sign out</button>
          </form>
        ) : <Link href="/login" className="btn btn-gold">Sign in</Link>}
      </div>
      <nav className="wrap nav" aria-label="Main">
        {TABS.map(([name, href]) => (
          <Link key={href} href={href} aria-current={name === active ? 'page' : undefined}>{name}</Link>
        ))}
      </nav>
    </header>
  );
}

export function Footer({ note }: { note: string }) {
  return (
    <footer className="foot">
      <span>{note}</span>
      <span>Education and scenarios, not investment advice</span>
    </footer>
  );
}
