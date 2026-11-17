// Transactional email through Resend (https://resend.com). Without RESEND_API_KEY nothing is sent.
import { STAGES } from './sixs';
import { trackFor } from './curriculum';
import { SITE } from './site';

export const emailConfigured = () => !!process.env.RESEND_API_KEY;

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY; if (!key) return false;
  const from = process.env.EMAIL_FROM || `SIXXAB Money <hello@${new URL(SITE.url).hostname}>`;
  const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify({ from, to, subject, html }), signal: AbortSignal.timeout(15_000) });
  if (!res.ok) console.warn(`email to member failed: HTTP ${res.status}`);
  return res.ok;
}

export type WelcomeKind = 'welcome_d0' | 'welcome_d2' | 'welcome_d7' | 'welcome_d14';
export const WELCOME_SCHEDULE: { kind: WelcomeKind; day: number }[] = [{ kind: 'welcome_d0', day: 0 }, { kind: 'welcome_d2', day: 2 }, { kind: 'welcome_d7', day: 7 }, { kind: 'welcome_d14', day: 14 }];

const wrap = (body: string) => `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;color:#0b1b33;line-height:1.5">${body}<p style="color:#667;font-size:12px;margin-top:24px">SIXXAB Money is financial education, not investment advice. You get this because you joined SIXXAB Money. <a href="${SITE.url}/my-money">Manage email preferences</a>.</p></div>`;

export function welcomeEmail(kind: WelcomeKind, p: { name: string | null; stage: number; referralCode: string | null; foundingNumber: number | null }): { subject: string; html: string } {
  const hi = p.name ? `Hi ${p.name.split(' ')[0]},` : 'Hi,';
  const s = STAGES.find((x) => x.n === p.stage) ?? STAGES[0];
  const t = trackFor(p.stage);
  const btn = (href: string, label: string) => `<p><a href="${SITE.url}${href}" style="background:#e3b341;color:#0b1b33;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">${label}</a></p>`;
  switch (kind) {
    case 'welcome_d0': return { subject: `Welcome to SIXXAB Money: you're at Stage ${s.n}, ${s.name}`, html: wrap(`<p>${hi}</p><p>${p.foundingNumber ? `You're founding member #${p.foundingNumber} of 100, free for good. ` : ''}You start at <b>Stage ${s.n} · ${s.name}</b>: ${s.focus.toLowerCase()}.</p><p><b>This week:</b> ${t.lessons[0].title}. ${t.lessons[0].action}.</p>${btn('/my-money/journey', 'Open my journey')}<p>Sunil<br/>Founder, SIXXAB Money</p>`) };
    case 'welcome_d2': return { subject: 'Your first lesson takes 5 minutes', html: wrap(`<p>${hi}</p><p>Small steps build the habit that moves you up a stage. Your next one:</p><p><b>${t.lessons[1].title}</b>: ${t.lessons[1].action}.</p><p>Stuck? Ask the coach anything, like "how much should my emergency fund be?"</p>${btn('/ask', 'Ask the coach')}`) };
    case 'welcome_d7': return { subject: 'One week in: do your first check-in', html: wrap(`<p>${hi}</p><p>The monthly check-in is how SIXXAB tracks your progress toward the next stage: one habit question and your net worth. It takes under a minute.</p>${btn('/my-money/journey', 'Do my check-in')}<p>Also new: the market risk meter on the home page shows whether fear is calm, normal, elevated or in panic.</p>`) };
    case 'welcome_d14': return { subject: 'Know someone who should start their money journey?', html: wrap(`<p>${hi}</p><p>SIXXAB Money is free for its first 100 members. If a friend, a colleague or your kids (11+) would benefit, share your link:</p><p style="font-size:16px"><b>${SITE.url}/login?join=1${p.referralCode ? `&ref=${p.referralCode}` : ''}</b></p><p>Three friends who join unlock Pro free for a year when it launches.</p>${btn('/my-money', 'See my invite link')}`) };
  }
}
