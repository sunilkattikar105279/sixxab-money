import Link from 'next/link';
import { suggestions } from '@/lib/search';
import { memberClient } from '@/lib/supabase/server';

const PUBLIC_TABS = [
  ['Home', '/'], ['Screener', '/screener'], ['Maps', '/maps'], ['Economy', '/economy'], ['World & Policy', '/world'], ['Learn', '/learn'], ['Levels', '/levels'],
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
          <label className="sr" htmlFor="q">Search a ticker, company, country or policy, or ask a question</label>
          <input id="q" name="q" type="search" list="search-suggest" autoComplete="off" enterKeyHint="search" placeholder="Search NVDA, Reliance, tariffs, Fed, India inflation… or ask a question" />
          <datalist id="search-suggest">{suggestions().map((x) => <option key={x} value={x} />)}</datalist>
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
            <Link href="/my-money" className="btn btn-gold">My Money</Link>
            <button className="btn" type="submit" style={{ background: 'transparent', color: 'var(--muted)', border: '1px solid var(--line2)' }}>Sign out</button>
          </form>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link href="/login" className="btn btn-line">Sign in</Link>
            <Link href="/login?join=1" className="btn btn-gold">Join free</Link>
          </div>
        )}
      </div>
      <nav className="wrap nav" aria-label="Main">
        {PUBLIC_TABS.map(([name, href]) => (
          <Link key={href} href={href} aria-current={name === active ? 'page' : undefined}>{name}</Link>
        ))}
        {user && <Link href="/my-money" aria-current={active === 'My Money' ? 'page' : undefined} className="nav-member">My Money</Link>}
      </nav>
    </header>
  );
}

export function Footer({ note }: { note: string }) {
  return (
    <footer className="foot">
      <div className="foot-row">
        <span>{note}</span>
        <nav aria-label="Legal and status" className="foot-links">
          <Link href="/legal/disclosures">Disclosures</Link>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/terms">Terms</Link>
          <Link href="/status">Status</Link>
        </nav>
      </div>
      <p className="foot-legal">
        SIXXAB Money provides financial education only. It is not a registered investment adviser or broker-dealer, and not a SEBI-registered adviser or research analyst. Scores, setups and levels are educational scenarios, not recommendations. Investing involves risk, including loss of principal. Market data may be delayed. <Link href="/legal/disclosures">Read the full disclosures</Link>.
      </p>
    </footer>
  );
}
