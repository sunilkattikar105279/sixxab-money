// Daily: send the welcome sequence (day 0, 2, 7, 14) to members who opted in. Runs after the nightly ingest.
// Needs RESEND_API_KEY (and EMAIL_FROM); without it the script only reports who is due.
import { createClient } from '@supabase/supabase-js';
import { emailConfigured, sendEmail, welcomeEmail, WELCOME_SCHEDULE } from '../src/lib/email';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env missing');
  const db = createClient(url, key, { auth: { persistSession: false } });
  const since = new Date(Date.now() - 16 * 864e5).toISOString();
  const { data: members, error } = await db.from('profiles').select('id, full_name, stage, referral_code, founding_number, created_at, email_updates, status').gte('created_at', since).eq('status', 'active');
  if (error) { console.warn(`welcome emails skipped: ${error.message}`); return; }
  const { data: sent } = await db.from('email_log').select('member_id, kind').in('member_id', (members ?? []).map((m) => m.id));
  const done = new Set((sent ?? []).map((r) => `${r.member_id}:${r.kind}`));
  let due = 0, ok = 0;
  for (const m of members ?? []) {
    const age = Math.floor((Date.now() - Date.parse(m.created_at)) / 864e5);
    for (const step of WELCOME_SCHEDULE) {
      // Day-0 email always (account email); later ones only with the email-updates opt-in
      if (age < step.day || done.has(`${m.id}:${step.kind}`) || (step.day > 0 && !m.email_updates)) continue;
      if (age > step.day + 2) continue; // missed window: don't send stale emails
      due++;
      if (!emailConfigured()) continue;
      const { data: u } = await db.auth.admin.getUserById(m.id);
      const to = u?.user?.email; if (!to) continue;
      const { subject, html } = welcomeEmail(step.kind, { name: m.full_name, stage: m.stage, referralCode: m.referral_code, foundingNumber: m.founding_number });
      if (await sendEmail(to, subject, html)) { ok++; await db.from('email_log').insert({ member_id: m.id, kind: step.kind }); }
    }
  }
  console.log(`welcome emails: ${due} due, ${ok} sent${emailConfigured() ? '' : ' (RESEND_API_KEY not set, nothing sent)'}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
