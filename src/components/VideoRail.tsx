import { Reel } from './Reel';
import type { Video } from '@/lib/media';

/** A horizontal rail of reels with a heading. Scrolls sideways on small screens. */
export function VideoRail({ title, items, note }: { title: string; items: Video[]; note?: string }) {
  if (!items.length) return null;
  return (
    <section className="card" aria-label={title}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <h2>{title}</h2>{note && <span className="dim" style={{ fontSize: 12 }}>{note}</span>}
      </div>
      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 6, scrollSnapType: 'x mandatory' }}>
        {items.map((v) => <div key={v.id} style={{ flex: '0 0 300px', scrollSnapAlign: 'start' }}><Reel url={v.url} title={v.title} compact /></div>)}
      </div>
    </section>
  );
}
