import type Anthropic from '@anthropic-ai/sdk';
import { getIndicator, INDICATORS } from '../data/fred';
import { getSnapshot } from '../data/market';
import { adminClient } from '../supabase/admin';

export interface ToolOut {
  data: unknown;
  sources: { name: string; asOf?: string }[];
}

const ALL: Record<string, Anthropic.Tool> = {
  get_market_snapshot: {
    name: 'get_market_snapshot',
    description: 'Latest stored close for the main indices of a market, with source and timestamp.',
    input_schema: { type: 'object', properties: { market: { type: 'string', enum: ['US', 'IN', 'GLOBAL'] } }, required: ['market'] },
  },
  get_indicator: {
    name: 'get_indicator',
    description: `Latest value of a US economic indicator from FRED. Keys: ${Object.keys(INDICATORS).join(', ')}.`,
    input_schema: { type: 'object', properties: { key: { type: 'string', enum: Object.keys(INDICATORS) } }, required: ['key'] },
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
    case 'get_indicator': {
      const v = await getIndicator(String(input.key));
      return { data: v, sources: v ? [{ name: `FRED ${v.seriesId}`, asOf: v.date }] : [] };
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
