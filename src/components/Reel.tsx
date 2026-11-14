'use client';
import { useEffect } from 'react';

declare global { interface Window { instgrm?: { Embeds: { process: () => void } } } }

/** Instagram's official embed for a published reel. Loads embed.js once and re-processes on mount. */
export function Reel({ url, title, compact = false }: { url: string; title: string; compact?: boolean }) {
  useEffect(() => {
    const run = () => window.instgrm?.Embeds.process();
    if (window.instgrm) { run(); return; }
    if (!document.getElementById('ig-embed')) {
      const s = document.createElement('script');
      s.id = 'ig-embed'; s.async = true; s.src = 'https://www.instagram.com/embed.js'; s.onload = run;
      document.body.appendChild(s);
    } else document.getElementById('ig-embed')!.addEventListener('load', run, { once: true });
  }, [url]);

  return (
    <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 6, maxWidth: compact ? 340 : 400, width: '100%' }}>
      <blockquote className="instagram-media" data-instgrm-permalink={url} data-instgrm-version="14" data-instgrm-captioned="false" style={{ background: '#0F2342', border: 0, borderRadius: 12, margin: 0, minWidth: 260, width: '100%', padding: 0 }}>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: 16 }}>Watch on Instagram: {title}</a>
      </blockquote>
      <figcaption className="muted" style={{ fontSize: 12 }}>{title}</figcaption>
    </figure>
  );
}
