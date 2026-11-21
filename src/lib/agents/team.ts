// The SIXXAB Money agent team: one orchestrator routes each request to specialist agents named in financial terms.
// Display names live here so pages, the coach and the daily brief all use the same words.

export type AgentKey = 'quant' | 'sigma' | 'pulse' | 'delta' | 'pivot' | 'moat' | 'tape' | 'macro' | 'geo' | 'mentor' | 'basis' | 'audit';

export interface Agent { key: AgentKey; name: string; role: string; term: string; does: string; href: string | null }

export const POWERED_BY = 'powered by SIXXAB Money';

export const TEAM: Agent[] = [
  { key: 'quant', name: 'Quant', role: 'Screener', term: 'A quantitative analyst who scores markets with rules and data', does: 'Scores every stock 1–10 from trend, breaks, accumulation, business results, news, industry and market regime, and builds setups.', href: '/screener' },
  { key: 'sigma', name: 'Sigma', role: 'Risk meter', term: 'σ, the symbol for volatility', does: 'Reads VIX and India VIX with index volume, sets the market regime and the position-size rule.', href: '/#risk' },
  { key: 'pulse', name: 'Pulse', role: 'Market sentiment', term: 'The heartbeat of the market: fear or greed', does: 'Builds SIXXAB Sentiment, one 0 to 100 fear-and-greed score for the US, India and world markets, from volatility, trend, breadth, credit, the dollar, the rupee and gold. Shows where money is moving between markets and how closely they move together.', href: '/sentiment' },
  { key: 'delta', name: 'Delta', role: 'Sector rotation', term: 'Rate of change', does: 'Tracks which sectors are leading, improving, weakening or lagging against the index, with Wyckoff and Elliott phases.', href: '/sectors' },
  { key: 'pivot', name: 'Pivot', role: 'Levels and cycles', term: 'The price levels where trends turn', does: 'Finds break levels, supply and demand zones, the Wyckoff cycle and the Elliott wave count, with the price that cancels it.', href: '/levels' },
  { key: 'moat', name: 'Moat', role: 'Business strength', term: 'A durable business advantage', does: 'Reads the latest annual filings from SEC EDGAR: revenue growth, margins, cash flow and debt.', href: null },
  { key: 'tape', name: 'Tape', role: 'Markets', term: 'Reading the tape: following market action', does: 'Explains what moved and why across US, India and global markets, and writes the daily brief.', href: '/' },
  { key: 'macro', name: 'Macro', role: 'Economy', term: 'The big-picture economy', does: 'Covers the Fed, RBI, inflation, jobs, GDP, rates and currencies, and what they mean for your money.', href: '/economy' },
  { key: 'geo', name: 'Geo', role: 'World and policy', term: 'Geopolitical risk', does: 'Trade, tariffs, sanctions, elections and regulation: the facts, each side’s case, and what it means for your money.', href: '/world' },
  { key: 'mentor', name: 'Mentor', role: 'Money coach', term: 'Your guide through the six stages', does: 'Guides you through the SIXXAB stages with a 90-day plan and monthly check-ins.', href: '/ask' },
  { key: 'basis', name: 'Basis', role: 'Learning', term: 'The foundation (and cost basis, basis points)', does: 'Teaches money basics at your age and stage, with a 12-week track per stage.', href: '/learn' },
  { key: 'audit', name: 'Audit', role: 'Guardrails', term: 'Independent checking', does: 'Checks every answer before you see it: sources cited, both sides on politics, no buy or sell calls.', href: null },
];

export const agent = (k: AgentKey) => TEAM.find((a) => a.key === k)!;
/** "Quant · Screener" */
export const tagOf = (k: AgentKey) => `${agent(k).name} · ${agent(k).role}`;
