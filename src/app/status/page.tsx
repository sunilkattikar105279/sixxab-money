import { Header, Footer } from '@/components/Header';
import { checks } from '@/lib/health';

export const dynamic = 'force-dynamic';

export default async function Status() {
  const list = await checks();
  const bad = list.filter((c) => c.ok === false).length, off = list.filter((c) => c.ok === null).length;
  return (
    <>
      <Header active="" />
      <main className="wrap">
        <section className="bar"><span className="tag teal">Connections</span><span style={{ flex: '1 1 480px' }}>{bad ? `${bad} connection${bad > 1 ? 's' : ''} failing` : 'No failing connections'}{off ? ` · ${off} not configured yet` : ''}. Keys live in .env.local (local) or Vercel environment variables (live).</span></section>
        <section className="card scroll">
          <table className="compact">
            <thead><tr><th>Service</th><th>Status</th><th>Detail</th><th>Setting needed</th></tr></thead>
            <tbody>{list.map((c) => (
              <tr key={c.name}>
                <td style={{ fontWeight: 600, color: '#fff' }}>{c.name}</td>
                <td><span className={`chip ${c.ok === true ? 'up' : c.ok === false ? 'down' : 'flat'}`}>{c.ok === true ? 'OK' : c.ok === false ? 'FAILING' : 'NOT SET'}</span></td>
                <td className="muted">{c.detail}</td>
                <td className="mono dim" style={{ fontSize: 12 }}>{c.needed}</td>
              </tr>
            ))}</tbody>
          </table>
        </section>
        <Footer note="Checks run on each visit with an 8-second limit per service" />
      </main>
    </>
  );
}
