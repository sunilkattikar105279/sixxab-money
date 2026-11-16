import type { Metadata } from 'next';
import { LegalPage } from '@/components/Legal';
import { SITE } from '@/lib/site';

export const metadata: Metadata = { title: 'Disclosures', description: 'What SIXXAB Money is and is not: education, data sources and delays, AI answers, risks.' };

export default function Disclosures() {
  return (
    <LegalPage title="Important disclosures" current="/legal/disclosures">
      <h2>Education, not advice</h2>
      <p>{SITE.name} is an educational service. It is not a registered investment adviser, broker-dealer or financial planner with the U.S. Securities and Exchange Commission, FINRA or any state, and it is not a SEBI-registered investment adviser or research analyst in India. Nothing on this site is a recommendation to buy, sell or hold any security, or personalised financial, tax or legal advice.</p>

      <h2>Scores, screener setups and levels</h2>
      <p>The 1–10 company scores, screener setups (entry, stop, target, reward-to-risk) and index levels are produced by fixed rules from price, volume and public company data, such as trends, cycles, accumulation and distribution, Wyckoff phases and Elliott wave checks. They are educational scenarios that show how these methods work. They do not consider your goals, finances or risk tolerance, they are often wrong, and past patterns do not predict future results.</p>
      <p>India price-based levels and trade setups are not shown to the public.</p>

      <h2>Risk</h2>
      <p>Investing and trading involve risk, including the loss of more than you invest when using leverage, options or short selling. Short-term trading carries higher risk than long-term investing. Talk to a qualified, registered professional before making financial decisions.</p>

      <h2>Data sources and delays</h2>
      <ul>
        <li><b>US prices:</b> Alpaca (IEX exchange feed). IEX shows one exchange&apos;s trades, so prices can differ slightly from the consolidated market price.</li>
        <li><b>India prices:</b> Upstox market data, where enabled.</li>
        <li><b>Global prices:</b> Twelve Data, updated in a nightly scan.</li>
        <li><b>Economy:</b> Federal Reserve Bank of St. Louis (FRED). <b>Company results:</b> SEC EDGAR. <b>News:</b> Finnhub.</li>
      </ul>
      <p>Prices may be delayed, incomplete or wrong, and screener results come from the most recent scan, shown with its date. Always check prices with your broker before acting.</p>

      <h2>AI answers</h2>
      <p>The {SITE.name} agent uses Claude models from Anthropic. AI answers can be incomplete or wrong. Every answer shows its sources, data date and confidence, and is recorded in our transparency ledger. Changes to how the agents learn pass review gates, and changes affecting minors, advice limits, politics or emotions need two human approvers.</p>

      <h2>Politics and world events</h2>
      <p>World and policy pages explain events and their possible economic effects. They do not support any party or candidate.</p>

      <h2>Conflicts of interest</h2>
      <p>No company pays to appear on {SITE.name}, and there is no paid placement. The people behind {SITE.name} may own securities that appear on the site; scores and setups are produced by the same rules for every company.</p>
    </LegalPage>
  );
}
