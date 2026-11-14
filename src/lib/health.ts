// Connection checks for /status. Each check is a cheap read with a short timeout; secrets are never returned.
import Anthropic from '@anthropic-ai/sdk';
import { adminClient } from './supabase/admin';

export interface Check { name: string; ok: boolean | null; detail: string; needed: string }
const t = (ms = 8000) => AbortSignal.timeout(ms);
const has = (...k: string[]) => k.every((x) => !!process.env[x]);

async function run(name: string, needed: string, configured: boolean, fn: () => Promise<string>): Promise<Check> {
  if (!configured) return { name, ok: null, detail: 'not configured', needed };
  try { return { name, ok: true, detail: await fn(), needed }; }
  catch (e) { return { name, ok: false, detail: e instanceof Error ? e.message.slice(0, 160) : 'failed', needed }; }
}

export async function checks(): Promise<Check[]> {
  return Promise.all([
    run('Supabase database', 'NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY', has('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'), async () => {
      const db = adminClient()!;
      const { count, error } = await db.from('stage_gates').select('*', { count: 'exact', head: true });
      if (error) throw new Error(error.message);
      const tables = ['stock_quotes', 'stock_analysis', 'videos'];
      const missing: string[] = [];
      for (const tb of tables) { const r = await db.from(tb).select('*', { head: true, count: 'exact' }); if (r.error) missing.push(tb); }
      return `connected · ${count} stage gates${missing.length ? ` · run migrations for: ${missing.join(', ')}` : ' · all tables present'}`;
    }),
    run('Supabase sign-in', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', has('NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'), async () => {
      const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! }, signal: t() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as { external?: { email?: boolean; phone?: boolean } };
      return `email sign-in ${j.external?.email ? 'on' : 'off'} · phone ${j.external?.phone ? 'on' : 'off'}`;
    }),
    run('Claude API (agents)', 'ANTHROPIC_API_KEY', has('ANTHROPIC_API_KEY'), async () => {
      const page = await new Anthropic().models.list({ limit: 20 });
      const ids = page.data.map((m) => m.id);
      const want = [process.env.SIXXAB_ROUTER_MODEL || 'claude-haiku-5-5', process.env.SIXXAB_ANSWER_MODEL || 'claude-sonnet-5-5'];
      const miss = want.filter((w) => !ids.some((i) => i.startsWith(w)));
      return miss.length ? `connected · model not listed: ${miss.join(', ')}` : `connected · ${want.join(' + ')}`;
    }),
    run('FRED (US economy)', 'FRED_API_KEY', has('FRED_API_KEY'), async () => {
      const r = await fetch(`https://api.stlouisfed.org/fred/series?series_id=DFF&api_key=${process.env.FRED_API_KEY}&file_type=json`, { signal: t() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`); return 'connected';
    }),
    run('Alpaca (US prices)', 'ALPACA_KEY_ID, ALPACA_SECRET_KEY', has('ALPACA_KEY_ID', 'ALPACA_SECRET_KEY'), async () => {
      const r = await fetch('https://data.alpaca.markets/v2/stocks/SPY/bars/latest?feed=iex', { headers: { 'APCA-API-KEY-ID': process.env.ALPACA_KEY_ID!, 'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY! }, signal: t() });
      if (!r.ok) throw new Error(`HTTP ${r.status}${r.status === 403 ? ' (check the key pair is from the Paper account)' : ''}`);
      const j = (await r.json()) as { bar?: { c: number; t: string } }; return `connected · SPY ${j.bar?.c ?? '?'} at ${j.bar?.t?.slice(0, 16) ?? '?'}`;
    }),
    run('Upstox (India prices)', 'UPSTOX_ACCESS_TOKEN', has('UPSTOX_ACCESS_TOKEN'), async () => {
      const r = await fetch('https://api.upstox.com/v3/market-quote/ltp?instrument_key=NSE_INDEX%7CNifty%2050', { headers: { Accept: 'application/json', Authorization: `Bearer ${process.env.UPSTOX_ACCESS_TOKEN}` }, signal: t() });
      if (!r.ok) throw new Error(`HTTP ${r.status}${r.status === 401 ? ' (token expired or wrong; generate an Analytics Token)' : ''}`);
      return 'connected';
    }),
    run('Twelve Data (global prices)', 'TWELVEDATA_API_KEY', has('TWELVEDATA_API_KEY'), async () => {
      const r = await fetch(`https://api.twelvedata.com/api_usage?apikey=${process.env.TWELVEDATA_API_KEY}`, { signal: t() });
      const j = (await r.json()) as { current_usage?: number; plan_limit?: number; code?: number; message?: string };
      if (j.code && j.code >= 400) throw new Error(j.message ?? `code ${j.code}`);
      return `connected · ${j.current_usage ?? 0} of ${j.plan_limit ?? '?'} credits used this minute`;
    }),
    run('Finnhub (US news)', 'FINNHUB_API_KEY', has('FINNHUB_API_KEY'), async () => {
      const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${process.env.FINNHUB_API_KEY}`, { signal: t() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`); return 'connected';
    }),
    run('SEC EDGAR (US results)', 'SEC_USER_AGENT', has('SEC_USER_AGENT'), async () => {
      const r = await fetch('https://data.sec.gov/api/xbrl/companyconcept/CIK0000320193/us-gaap/NetIncomeLoss.json', { headers: { 'User-Agent': process.env.SEC_USER_AGENT! }, signal: t() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`); return 'connected';
    }),
    run('Daily jobs (cron secret)', 'SIXXAB_CRON_SECRET', has('SIXXAB_CRON_SECRET'), async () => 'set'),
  ]);
}
