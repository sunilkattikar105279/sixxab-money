'use client';
import { useEffect, useState } from 'react';
import { track } from '@/lib/track';

export function InviteLink({ code }: { code: string }) {
  const [url, setUrl] = useState(`/login?ref=${code}`);
  const [copied, setCopied] = useState(false);
  useEffect(() => setUrl(`${location.origin}/login?ref=${code}`), [code]);

  const text = 'I’m using SIXXAB Money, a free money coach for the US and India. Join me:';
  async function share() {
    track('invite_copied', { via: 'navigator' in globalThis && 'share' in navigator ? 'share' : 'copy' });
    if (navigator.share) { try { await navigator.share({ title: 'SIXXAB Money', text, url }); return; } catch { /* cancelled */ } }
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* clipboard blocked */ }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label className="sr" htmlFor="invite">Your invite link</label>
      <input id="invite" readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="mono" style={{ fontSize: 12 }} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-gold" onClick={share}>{copied ? 'Link copied' : 'Share my link'}</button>
        <a className="btn btn-line" href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`} target="_blank" rel="noopener noreferrer" onClick={() => track('invite_copied', { via: 'whatsapp' })}>WhatsApp</a>
      </div>
      <span role="status" className="sr">{copied ? 'Invite link copied' : ''}</span>
    </div>
  );
}
