import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/Legal';
import { SITE } from '@/lib/site';

export const metadata: Metadata = { title: 'Terms of use', description: 'The terms for using SIXXAB Money.' };

export default function Terms() {
  return (
    <LegalPage title="Terms of use" current="/legal/terms">
      <p>By using {SITE.name} you agree to these terms. If you do not agree, please do not use the site.</p>

      <h2>1. Educational service</h2>
      <p>{SITE.name} provides financial education, market data and AI-generated explanations. It does not provide investment, tax or legal advice. See our <Link href="/legal/disclosures">Disclosures</Link>. You are responsible for your own financial decisions.</p>

      <h2>2. Eligibility</h2>
      <p>You must be at least 11 years old to create an account. If you are under 18, a parent or guardian must link and approve your account and agree to these terms for you.</p>

      <h2>3. Your account</h2>
      <p>Keep your sign-in details private and tell us if you think someone else has used your account. Give accurate information, especially your date of birth.</p>

      <h2>4. Acceptable use</h2>
      <p>Do not misuse the service. That includes scraping or reselling data, bypassing request limits, trying to make the agent produce harmful or misleading content, attacking the site, or using it to break any law. We may limit or close accounts that do.</p>

      <h2>5. Data and content</h2>
      <p>Market data belongs to its providers and is for your personal, non-commercial use. The {SITE.name} name, logo, scores and written content belong to {SITE.operator}. You keep ownership of what you enter, and you let us store and process it to run the service, as described in our <Link href="/legal/privacy">Privacy policy</Link>.</p>

      <h2>6. No warranty</h2>
      <p>The service, including data, scores, setups and AI answers, is provided &quot;as is&quot;, without warranties of accuracy, completeness or availability.</p>

      <h2>7. Limitation of liability</h2>
      <p>To the extent allowed by law, {SITE.operator} is not liable for any loss arising from your use of, or reliance on, the service, including trading or investment losses.</p>

      <h2>8. Changes</h2>
      <p>We may update these terms. We will change the date above and, for significant changes, tell members by email or on the site.</p>

      <h2>9. Law</h2>
      <p>These terms are governed by the laws of {SITE.jurisdiction}, without limiting any rights you have under the consumer laws of the country where you live.</p>

      <h2>Contact</h2>
      <p><a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a></p>
    </LegalPage>
  );
}
