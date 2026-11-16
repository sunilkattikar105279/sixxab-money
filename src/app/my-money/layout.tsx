import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Header, Footer } from '@/components/Header';
import { MemberNav } from '@/components/MemberNav';
import { getMember } from '@/lib/member';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'My Money', robots: { index: false } };

/** Member area: signed-in members with a profile only (the middleware already sends visitors to sign-in). */
export default async function MyMoneyLayout({ children }: { children: React.ReactNode }) {
  const m = await getMember();
  if (!m) redirect('/login?next=/my-money');
  if (!m.member) redirect('/onboarding');
  if (m.member.status === 'pending_parent_consent') {
    return (
      <>
        <Header active="My Money" />
        <main className="wrap" id="main" style={{ maxWidth: 640 }}>
          <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="tag gold">Waiting for a parent</div>
            <h1 style={{ fontSize: 24 }}>Almost there{m.member.name ? `, ${m.member.name.split(' ')[0]}` : ''}!</h1>
            <p className="muted" style={{ margin: 0 }}>Because you are under 18, a parent or guardian needs to join SIXXAB Money and link your account. Ask them to sign up and choose “Teach my kids about money”. Until then you can explore Learn, the daily brief and the coach.</p>
          </section>
        </main>
        <Footer note="Ages 11–17 join through a parent" />
      </>
    );
  }
  return (
    <>
      <Header active="My Money" />
      <div className="wrap"><MemberNav /></div>
      {children}
      <div className="wrap"><Footer note="Your data is private and never sold · Education, not investment advice" /></div>
    </>
  );
}
