// Header search: decide whether a query is a ticker, a company, a country, a policy topic or an economy indicator,
// and send the reader straight there. Anything else (a real question) goes to the agent.
import { UNIVERSE } from './data/universe';
import { COUNTRIES } from './data/world';
import type { Market } from './data/market';

export interface Hit { kind: 'stock' | 'country' | 'policy' | 'economy' | 'page'; label: string; href: string; hint?: string }

const POLICY: { words: RegExp; topic: string }[] = [
  { words: /\b(tariffs?|trade war|trade deal|duty|duties|import tax|wto)\b/i, topic: 'Trade & tariffs' },
  { words: /\b(elections?|vote|voting|ballot|poll(s)?|congress|parliament|lok sabha)\b/i, topic: 'Elections' },
  { words: /\b(fed|fomc|federal reserve|rbi|reserve bank|central banks?|ecb|boj|rate (cut|hike)s?|repo rate|monetary policy|powell)\b/i, topic: 'Central banks' },
  { words: /\b(sanctions?|embargo|export controls?)\b/i, topic: 'Sanctions' },
  { words: /\b(antitrust|merger|acquisition|regulation|sebi|sec rule|ipo)\b/i, topic: 'Corporate' },
];

const ECONOMY: { words: RegExp; c: 'US' | 'IN' | 'GLOBAL'; label: string; hash?: string }[] = [
  { words: /\b(m2|money supply|liquidity|balance sheet|qt|quantitative)\b/i, c: 'US', label: 'M2 money supply and liquidity', hash: '#money' },
  { words: /\b(housing|home prices?|mortgages?|case[- ]shiller|housing starts|home sales|real estate market)\b/i, c: 'US', label: 'US housing market', hash: '#housing' },
  { words: /\b(recession|yield curve|jobless claims|sahm)\b/i, c: 'US', label: 'Recession watch', hash: '#dashboard' },
  { words: /\b(india|indian)\b.*\b(inflation|cpi|gdp|jobs|unemployment|economy|wpi|iip)\b|\b(inflation|cpi|gdp|economy)\b.*\bindia\b/i, c: 'IN', label: 'India economy' },
  { words: /\b(inflation|cpi|pce|gdp|jobs report|payrolls|nfp|unemployment|jobless|retail sales|yields?|treasur(y|ies)|economy|recession)\b/i, c: 'US', label: 'US economy' },
];

const PAGES: { words: RegExp; label: string; href: string }[] = [
  { words: /^(screener|setups?|scan)$/i, label: 'Screener', href: '/screener' },
  { words: /^(levels?|s&p levels|spx|qqq levels)$/i, label: 'Levels', href: '/levels' },
  { words: /^(learn|lessons?|stages?|journey)$/i, label: 'Learn', href: '/learn' },
  { words: /^(maps?|heat ?map)$/i, label: 'Maps', href: '/maps' },
  { words: /^(my money|budget|plan|dashboard)$/i, label: 'My Money', href: '/my-money' },
];

const ALIASES: Record<string, string> = { google: 'GOOGL', alphabet: 'GOOGL', facebook: 'META', 'berkshire': 'BRK.B', tesla: 'TSLA', amazon: 'AMZN' };

const clean = (q: string) => q.replace(/\s+[—–-]\s+.*$/, '').replace(/^\$/, '').trim(); // "NVDA — Nvidia" from the suggestion list

/** Looks like a question rather than a lookup: send to the agent even if it mentions a ticker. */
export const isQuestion = (q: string) => /\?|^(why|what|how|should|can|is|are|does|do|will|when|explain|tell|compare|which)\b/i.test(q.trim()) || q.trim().split(/\s+/).length > 5;

export function search(raw: string): Hit[] {
  const q = clean(raw);
  if (!q) return [];
  const lower = q.toLowerCase();
  const hits: Hit[] = [];
  const seen = new Set<string>();
  const add = (h: Hit) => { if (!seen.has(h.href)) { seen.add(h.href); hits.push(h); } };

  // Stocks: exact symbol first, then alias, then name or symbol contains the query
  const markets = Object.keys(UNIVERSE) as Market[];
  const sym = (ALIASES[lower] ?? q).toUpperCase().replace(/\.NS$|\.BO$/, '');
  for (const m of markets) for (const l of UNIVERSE[m]) if (l.symbol.toUpperCase() === sym) add({ kind: 'stock', label: `${l.symbol} · ${l.name}`, href: `/stock/${m}/${encodeURIComponent(l.symbol)}`, hint: `${l.sector} · ${m}` });
  if (lower.length >= 2) for (const m of markets) for (const l of UNIVERSE[m]) {
    if (l.name.toLowerCase().includes(lower) || (lower.length >= 3 && l.symbol.toLowerCase().startsWith(lower))) add({ kind: 'stock', label: `${l.symbol} · ${l.name}`, href: `/stock/${m}/${encodeURIComponent(l.symbol)}`, hint: `${l.sector} · ${m}` });
  }
  // A ticker-shaped query we don't cover yet: still offer the stock page (it explains when analysis is missing)
  if (!hits.length && /^[A-Z]{1,5}(\.[A-Z])?$/.test(q)) add({ kind: 'stock', label: `${q} (not in our scan yet)`, href: `/stock/US/${q}`, hint: 'US' });

  for (const c of COUNTRIES) if (c.name.toLowerCase() === lower || c.code.toLowerCase() === lower || (lower.length >= 4 && c.name.toLowerCase().includes(lower))) {
    add({ kind: 'country', label: `${c.name} market`, href: c.code === 'IN' ? '/economy?c=IN' : '/maps', hint: `country ETF ${c.etf}` });
  }
  for (const p of POLICY) if (p.words.test(q)) add({ kind: 'policy', label: `${p.topic} briefs`, href: `/world?t=${encodeURIComponent(p.topic)}`, hint: 'World & Policy' });
  for (const e of ECONOMY) if (e.words.test(q)) { add({ kind: 'economy', label: e.label, href: `/economy?c=${e.c}${e.hash ?? ''}`, hint: 'Macro · Economy' }); break; }
  for (const p of PAGES) if (p.words.test(q)) add({ kind: 'page', label: p.label, href: p.href });
  return hits.slice(0, 8);
}

/** One confident destination, or null when the reader should choose (or ask the agent). */
export function bestRoute(raw: string): string | null {
  if (isQuestion(raw)) return null;
  const hits = search(raw);
  if (hits.length === 1) return hits[0].href;
  const q = clean(raw).toUpperCase();
  const exact = hits.find((h) => h.kind === 'stock' && h.label.startsWith(`${q} ·`));
  return exact ? exact.href : null;
}

/** Suggestions for the header's type-ahead list. */
export function suggestions(): string[] {
  const out: string[] = [];
  for (const m of Object.keys(UNIVERSE) as Market[]) for (const l of UNIVERSE[m]) out.push(`${l.symbol} — ${l.name}`);
  return out.concat(['Fed rate cut', 'RBI repo rate', 'Tariffs', 'US inflation', 'India inflation', 'Elections']);
}
