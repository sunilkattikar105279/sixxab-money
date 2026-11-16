import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="wrap" id="main" style={{ maxWidth: 560, paddingTop: 80 }}>
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="tag gold">Page not found</div>
        <h1 style={{ fontSize: 26 }}>We couldn&apos;t find that page</h1>
        <p className="muted" style={{ margin: 0 }}>It may have moved. Try the home page, or ask the coach what you were looking for.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/" className="btn btn-gold">Go home</Link>
          <Link href="/ask" className="btn btn-line">Ask the coach</Link>
        </div>
      </section>
    </main>
  );
}
