// Guardrail agent, rule layer. Every answer passes here before a user sees it.
// Rules first (fast, deterministic, testable); the orchestrator can add an LLM review on top.

export interface GuardContext {
  isMinor: boolean;
  country: 'US' | 'IN';
  /** True once the operating entity holds the registration that allows personalised advice in that country. */
  adviceRegistered: boolean;
}

export interface GuardResult {
  ok: boolean;
  text: string;
  flags: string[];
}

const ADVICE_PATTERNS = [
  /\byou should (buy|sell|short)\b/i,
  /\b(buy|sell|short) (this|these|it|now)\b/i,
  /\bguaranteed (return|profit|gain)s?\b/i,
  /\b(strong|definite) (buy|sell)\b/i,
  /\bput (all|most) of your (money|savings)\b/i,
  /\btarget price\b/i,
];

const PARTISAN_PATTERNS = [/\bvote (for|against)\b/i, /\b(the right|the correct) party\b/i, /\bwe (support|endorse)\b/i];

const MINOR_BLOCK_PATTERNS = [/\b(options|futures|margin|leverage|crypto) trad/i, /\bday ?trad/i, /\bborrow\b.*\binvest/i];

export const DISCLAIMER = 'Education and scenarios, not investment advice.';

export function guard(text: string, ctx: GuardContext): GuardResult {
  const flags: string[] = [];
  let out = text;

  if (!ctx.adviceRegistered && ADVICE_PATTERNS.some((p) => p.test(out))) {
    flags.push('personalised_advice');
  }
  if (PARTISAN_PATTERNS.some((p) => p.test(out))) {
    flags.push('partisan');
  }
  if (ctx.isMinor && MINOR_BLOCK_PATTERNS.some((p) => p.test(out))) {
    flags.push('minor_unsafe_topic');
  }

  if (flags.length) {
    return {
      ok: false,
      flags,
      text: refusalFor(flags, ctx),
    };
  }

  if (!out.includes(DISCLAIMER)) out = `${out.trim()}\n\n${DISCLAIMER}`;
  return { ok: true, flags, text: out };
}

function refusalFor(flags: string[], ctx: GuardContext): string {
  if (flags.includes('minor_unsafe_topic')) {
    return 'That one is for adult accounts. I can explain how it works in general terms, or we can work on your savings goal. ' + DISCLAIMER;
  }
  if (flags.includes('partisan')) {
    return 'I lay out each side’s case and the facts, but I don’t take political sides. Want the both-sides brief? ' + DISCLAIMER;
  }
  const regulator = ctx.country === 'IN' ? 'SEBI' : 'the SEC';
  return `I can’t tell you to buy or sell a specific investment: that needs a ${regulator}-registered adviser. I can show scenarios and the trade-offs so you can decide. ` + DISCLAIMER;
}

/** India education content may not use market price data from the preceding 30 days (SEBI, from July 1, 2026). */
export const INDIA_EDU_PRICE_LAG_DAYS = 30;

export function indiaPriceAllowedInEducation(priceDate: Date, now: Date = new Date()): boolean {
  const days = (now.getTime() - priceDate.getTime()) / 86_400_000;
  return days >= INDIA_EDU_PRICE_LAG_DAYS;
}
