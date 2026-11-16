import type { Metadata } from 'next';
import { LegalPage } from '@/components/Legal';
import { SITE } from '@/lib/site';

export const metadata: Metadata = { title: 'Privacy', description: 'What SIXXAB Money collects, why, who processes it, and your rights, including for children and parents.' };

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" current="/legal/privacy">
      <h2>What we collect</h2>
      <ul>
        <li><b>Account:</b> email address, date of birth and country (to apply age rules and show the right market).</li>
        <li><b>Your money journey:</b> plans, goals, budget figures, 6S stage progress and monthly checks you enter.</li>
        <li><b>Manage money:</b> the budget, emergency fund, debts and accounts you type in. We never connect to or move money in your bank or brokerage.</li>
        <li><b>Grow money:</b> your auto-trade rules and simulated paper trades.</li>
        <li><b>Mood check-ins:</b> how you feel about money. These are private to you and are never shown to linked parents.</li>
        <li><b>Agent questions and answers:</b> stored in the transparency ledger with sources and model details, plus any Yes/No feedback.</li>
        <li><b>Abuse protection:</b> a one-way hash of your IP address to enforce request limits. We do not store raw IP addresses.</li>
        <li><b>Usage analytics:</b> cookieless, aggregate page-view statistics (Vercel Web Analytics). No advertising or cross-site tracking.</li>
      </ul>

      <h2>What we do not do</h2>
      <p>We do not sell or rent personal data, show ads, or use your data to train AI models. We never ask for bank passwords or card numbers.</p>

      <h2>Cookies</h2>
      <p>We use only the essential cookies that keep you signed in. Visiting without an account sets no cookies.</p>

      <h2>Children and parents</h2>
      <p>Members must be at least 11. A member under 18 can only use their account after a parent or guardian creates their own account and links it. This covers children under 13 in the United States (COPPA) and under 18 in India (Digital Personal Data Protection Act, 2023). Linked parents can see their child&apos;s stage progress and plans but not mood check-ins. Parents can ask us to review or delete their child&apos;s data at any time. The agent uses stricter, minor-safe rules for members under 18.</p>

      <h2>Who processes your data</h2>
      <ul>
        <li><b>Supabase:</b> database and sign-in.</li>
        <li><b>Vercel:</b> hosting and cookieless analytics.</li>
        <li><b>Anthropic:</b> generates agent answers from the question you ask and limited context (country, age group, stage). It does not receive your email address.</li>
      </ul>
      <p>Market data providers receive no personal data.</p>

      <h2>Your rights</h2>
      <p>You can access, correct, export or delete your data, and withdraw consent, by emailing <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>. We reply within 30 days. Deleting your account removes your profile, plans and check-ins. Ledger entries are kept without your identity so the transparency record stays complete.</p>

      <h2>Retention and security</h2>
      <p>We keep account data while your account is open. Rate-limit records are deleted after two days. Data is encrypted in transit and at rest, and row-level security means each member can read only their own records.</p>

      <h2>Contact</h2>
      <p>{SITE.name} is operated by {SITE.operator}. Privacy questions: <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.</p>
    </LegalPage>
  );
}
