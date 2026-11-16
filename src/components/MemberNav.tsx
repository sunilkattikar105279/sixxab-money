'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/my-money', label: 'Dashboard', hint: 'Today' },
  { href: '/my-money/journey', label: 'Journey', hint: 'Your 6 stages' },
  { href: '/my-money/manage', label: 'Manage money', hint: 'Budget, debts, net worth' },
  { href: '/my-money/grow', label: 'Grow money', hint: 'Signals and auto-trades' },
];

export function MemberNav() {
  const path = usePathname();
  return (
    <nav className="member-nav" aria-label="My Money">
      {ITEMS.map((i) => {
        const on = i.href === '/my-money' ? path === i.href : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={on ? 'page' : undefined}>
            <span className="member-nav-label">{i.label}</span>
            <span className="member-nav-hint">{i.hint}</span>
          </Link>
        );
      })}
    </nav>
  );
}
