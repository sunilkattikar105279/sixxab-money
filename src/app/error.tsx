'use client';
import Link from 'next/link';
import { useEffect } from 'react';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="wrap" id="main" style={{ maxWidth: 560, paddingTop: 80 }}>
      <section className="card" role="alert" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="tag red">Something went wrong</div>
        <h1 style={{ fontSize: 26 }}>This page didn&apos;t load</h1>
        <p className="muted" style={{ margin: 0 }}>Usually a data source is slow for a moment. Your account and data are safe.{error.digest ? ` Reference: ${error.digest}.` : ''}</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-gold" onClick={reset}>Try again</button>
          <Link href="/" className="btn btn-line">Go home</Link>
        </div>
      </section>
    </main>
  );
}
