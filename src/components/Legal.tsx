import Link from 'next/link';
import { Header, Footer } from '@/components/Header';
import { SITE } from '@/lib/site';

export const LEGAL_PAGES = [
  { href: '/legal/disclosures', label: 'Disclosures' },
  { href: '/legal/privacy', label: 'Privacy' },
  { href: '/legal/terms', label: 'Terms' },
];

export function LegalPage({ title, current, children }: { title: string; current: string; children: React.ReactNode }) {
  return (
    <>
      <Header active="" />
      <main className="wrap" id="main">
        <div className="legal card">
          <nav className="seg" aria-label="Legal pages" style={{ alignSelf: 'flex-start' }}>
            {LEGAL_PAGES.map((p) => (
              <Link key={p.href} href={p.href} aria-current={p.href === current ? 'true' : undefined}>{p.label}</Link>
            ))}
          </nav>
          <h1>{title}</h1>
          <p className="dim">Last updated {SITE.legalUpdated} · Questions: <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a></p>
          {children}
        </div>
      </main>
      <Footer note={`${SITE.name} is operated by ${SITE.operator}`} />
    </>
  );
}
