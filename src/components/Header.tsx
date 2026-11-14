import Link from 'next/link';

const TABS = [
  ['Home', '/'], ['Economy', '/economy'], ['World & Policy', '/world'], ['My Money', '/my-money'], ['Learn', '/learn'], ['Levels', '/levels'],
] as const;

export function Header({ active, market }: { active: string; market?: 'US' | 'IN' | 'GLOBAL' }) {
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
        <Link href="/my-money" className="btn btn-gold">Start free</Link>
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
