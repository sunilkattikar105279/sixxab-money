import type Anthropic from '@anthropic-ai/sdk';
import { getIndicator, INDICATORS } from '../data/fred';
import { getSnapshot } from '../data/market';
import { macroSnapshot, macroBrief } from '../data/macro';
import { adminClient } from '../supabase/admin';
import { searchVideos } from '../media';
import { levelsAllowed } from '../compliance';
import { getSentiment } from '../data/regime';
import { creditSnapshot, creditBrief } from '../data/credit';

export interface ToolOut {
  data: unknown;
  sources: { name: string; asOf?: string }[];
  videos?: { title: string; url: string }[];
}

const ALL: Record<string, Anthropic.Tool> = {
  get_market_snapshot: {
    name: 'get_market_snapshot',
    description: 'Latest stored close for the main indices of a market, with source and timestamp.',
    input_schema: { type: 'object', properties: { market: { type: 'string', enum: ['US', 'IN', 'GLOBAL'] } }, required: ['market'] },
  },
  get_sentiment: {
    name: 'get_sentiment',
    description: "Pulse's latest SIXXAB Sentiment: 0-100 fear/greed for the US, India and the rest of the world, each signal behind it, Wyckoff phases, 60-day correlations and 3-month money-flow gaps.",
    input_schema: { type: 'object', properties: {} },
  },
  get_credit: {
    name: 'get_credit',
    description: "Spread's credit read from FRED: the corporate (HQM) vs Treasury yield curve by maturity now and a year ago, investment-grade and high-yield spreads and yields, the AAA/BBB/HY/CCC rating ladder, Moody's Baa spread, corporate profits (level, growth, share of GDP), corporate debt, correlations with the S&P 500, today's credit backdrop, the stocks-vs-bonds divergence check and scenarios with signposts.",
    input_schema: { type: 'object', properties: {} },
  },
  get_indicator: {
    name: 'get_indicator',
    description: `Latest value of a US economic indicator from FRED. Keys: ${Object.keys(INDICATORS).join(', ')}.`,
    input_schema: { type: 'object', properties: { key: { type: 'string', enum: Object.keys(INDICATORS) } }, required: ['key'] },
  },
  get_stock_analysis: {
    name: 'get_stock_analysis',
    description: 'Latest nightly analysis of one stock: SIXXAB 1-10 score with factor reasons, trend on Y/M/W/D/4H/1H, break levels, zones, Wyckoff cycle and Elliott read.',
    input_schema: { type: 'object', properties: { market: { type: 'string', enum: ['US', 'IN', 'GLOBAL'] }, symbol: { type: 'string' } }, required: ['market', 'symbol'] },
  },
  get_screener_setups: {
    name: 'get_screener_setups',
    description: 'Current screener setups for a market and mode (invest = investment & swing, day = day trades, quick = quick trades), best scores first.',
    input_schema: { type: 'object', properties: { market: { type: 'string', enum: ['US', 'IN', 'GLOBAL'] }, mode: { type: 'string', enum: ['invest', 'day', 'quick'] } }, required: ['market', 'mode'] },
  },
  get_macro: {
    name: 'get_macro',
    description: 'US money supply (M2, real M2, velocity, Fed balance sheet, net liquidity), housing (mortgage rate, payment on a median home, prices, sales, starts, supply), the economy dashboard (inflation, jobs, claims, retail sales, sentiment, yield curve, credit spreads), recession watch and the M2, inflation and stocks relationships. From FRED.',
    input_schema: { type: 'object', properties: {} },
  },
  get_latest_brief: {
    name: 'get_latest_brief',
    description: "Today's SIXXAB Money agent brief on the US market.",
    input_schema: { type: 'object', properties: {} },
  },
  get_policy_briefs: {
    name: 'get_policy_briefs',
    description: 'Published, editor-reviewed policy and geopolitics briefs (facts, both views, what it means for money).',
    input_schema: { type: 'object', properties: { topic: { type: 'string' } } },
  },
  find_videos: {
    name: 'find_videos',
    description: 'Find SIXXAB Money reels that explain a topic, to suggest alongside the answer.',
    input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  },
  get_member_progress: {
    name: 'get_member_progress',
    description: "The signed-in member's 6S stage, last monthly checks and active 90-day plan.",
    input_schema: { type: 'object', properties: {} },
  },
};

export function toolSchemas(names: string[]): Anthropic.Tool[] {
  return names.map((n) => ALL[n]).filter(Boolean);
}

export async function runTool(name: string, input: Record<string, unknown>, opts: { memberId?: string }): Promise<ToolOut> {
  switch (name) {
    case 'get_market_snapshot': {
      const snap = await getSnapshot(String(input.market || 'US') as 'US' | 'IN' | 'GLOBAL');
      return { data: snap, sources: [{ name: snap.source, asOf: snap.asOf }] };
    }
    case 'get_sentiment': {
      const s = await getSentiment();
      if (!s) return { data: { error: 'SIXXAB Sentiment has not run yet' }, sources: [] };
      const { history: _h, ...rest } = s;
      return { data: { ...rest, last30: s.history.slice(-30).map((p) => ({ date: p.date, score: p.score })) }, sources: [{ name: 'SIXXAB Money · Pulse (Yahoo Finance delayed data)', asOf: s.asOf }] };
    }
    case 'get_credit': {
      const c = await creditSnapshot();
      return { data: c.available ? creditBrief(c) : { error: 'FRED key not configured' }, sources: c.available ? [{ name: 'Spread · FRED (US Treasury HQM, ICE BofA, Moody’s, BEA, Federal Reserve)', asOf: c.asOf ?? undefined }] : [] };
    }
    case 'get_indicator': {
      const v = await getIndicator(String(input.key));
      return { data: v, sources: v ? [{ name: `FRED ${v.seriesId}`, asOf: v.date }] : [] };
    }
    case 'get_macro': {
      const snap = await macroSnapshot();
      return { data: snap.available ? macroBrief(snap) : { error: 'FRED key not configured' }, sources: snap.available ? [{ name: 'FRED (Federal Reserve Bank of St. Louis)' }] : [] };
    }
    case 'get_stock_analysis': {
      const db = adminClient(); if (!db) return { data: { error: 'database not configured' }, sources: [] };
      const market = String(input.market) as 'US' | 'IN' | 'GLOBAL', symbol = String(input.symbol).toUpperCase();
      const { data } = await db.from('stock_analysis').select('as_of, name, sector, composite, bias, factors, tech, source').eq('market', market).eq('symbol', symbol).order('as_of', { ascending: false }).limit(1).maybeSingle();
      if (!data) return { data: { error: `no analysis for ${symbol} yet` }, sources: [] };
      const tech = data.tech as Record<string, unknown>;
      const safe = levelsAllowed(market) ? tech : { trends: tech.trends, cycle: tech.cycle, waves: tech.waves, volume: tech.volume, note: 'price levels withheld for India until SEBI research-analyst registration' };
      return { data: { ...data, tech: safe }, sources: [{ name: `SIXXAB analysis (${data.source})`, asOf: data.as_of }] };
    }
    case 'get_screener_setups': {
      const db = adminClient(); if (!db) return { data: { error: 'database not configured' }, sources: [] };
      const market = String(input.market) as 'US' | 'IN' | 'GLOBAL';
      const { data: latest } = await db.from('screener_setups').select('as_of').eq('market', market).order('as_of', { ascending: false }).limit(1).maybeSingle();
      if (!latest) return { data: { error: 'no setups yet' }, sources: [] };
      const { data } = await db.from('screener_setups').select('symbol, side, entry, stop, target, rr, with_trend, timeframe, reasons, score').eq('market', market).eq('as_of', latest.as_of).eq('mode', String(input.mode)).order('score', { ascending: false }).limit(10);
      const rows = levelsAllowed(market) ? data : (data ?? []).map(({ symbol, side, timeframe, reasons, score }) => ({ symbol, side, timeframe, reasons, score }));
      return { data: { asOf: latest.as_of, setups: rows }, sources: [{ name: 'Quant (SIXXAB screener)', asOf: latest.as_of }] };
    }
    case 'get_latest_brief': {
      const db = adminClient(); if (!db) return { data: { error: 'database not configured' }, sources: [] };
      const { data } = await db.from('briefs').select('text, created_at').eq('market', 'US').order('created_at', { ascending: false }).limit(1).maybeSingle();
      return { data: data ?? { error: 'no brief yet' }, sources: data ? [{ name: 'Tape (SIXXAB daily brief)', asOf: String(data.created_at).slice(0, 10) }] : [] };
    }
    case 'get_policy_briefs': {
      const db = adminClient(); if (!db) return { data: { error: 'database not configured' }, sources: [] };
      let q = db.from('policy_briefs').select('tag, title, facts, view_a, view_b, money, sources, published_on').eq('status', 'published').order('published_on', { ascending: false }).limit(5);
      if (input.topic) q = q.ilike('tag', `%${String(input.topic)}%`);
      const { data } = await q;
      return { data: data ?? [], sources: (data ?? []).map((b) => ({ name: `Brief: ${b.title} (${b.sources})`, asOf: b.published_on })) };
    }
    case 'find_videos': {
      const vids = await searchVideos(String(input.query || ''), 2);
      return { data: vids.map((v) => ({ title: v.title, url: v.url, date: v.date })), sources: [] , videos: vids.map((v) => ({ title: v.title, url: v.url })) };
    }
    case 'get_member_progress': {
      if (!opts.memberId) return { data: { error: 'not signed in' }, sources: [] };
      const db = adminClient();
      if (!db) return { data: { error: 'database not configured' }, sources: [] };
      const [{ data: profile }, { data: checks }, { data: plan }] = await Promise.all([
        db.from('profiles').select('stage, country, dob').eq('id', opts.memberId).single(),
        db.from('monthly_checks').select('month, habit_gate_met, net_worth').eq('member_id', opts.memberId).order('month', { ascending: false }).limit(6),
        db.from('plans').select('starts_on, goals').eq('member_id', opts.memberId).eq('active', true).maybeSingle(),
      ]);
      return { data: { profile, checks, plan }, sources: [{ name: 'Your SIXXAB Money profile' }] };
    }
    default:
      return { data: { error: `unknown tool ${name}` }, sources: [] };
  }
}
