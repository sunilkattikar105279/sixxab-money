import type { Bar } from '../ta/bars';
import type { Market } from '../data/market';
import { alpacaBars } from './alpaca';
import { upstoxBars } from './upstox';
import { twelveBars } from './twelvedata';

export type FetchTF = '1m' | '5m' | '15m' | '1h' | '1d';

/** One call for bars in any market, routed to that market's free provider. */
export async function getBars(market: Market, symbol: string, tf: FetchTF, daysBack: number): Promise<Bar[]> {
  const start = new Date(Date.now() - daysBack * 86_400_000).toISOString();
  if (market === 'US') return alpacaBars(symbol, tf, start);
  if (market === 'IN') return upstoxBars(symbol, tf, start);
  return twelveBars(symbol, tf, Math.min(5000, tf === '1d' ? daysBack : 5000));
}

export function providerName(market: Market): string {
  return market === 'US' ? 'Alpaca (IEX feed)' : market === 'IN' ? 'Upstox (NSE)' : 'Twelve Data';
}

export function providerConfigured(market: Market): boolean {
  if (market === 'US') return !!(process.env.ALPACA_KEY_ID && process.env.ALPACA_SECRET_KEY);
  if (market === 'IN') return !!process.env.UPSTOX_ACCESS_TOKEN;
  return !!process.env.TWELVEDATA_API_KEY;
}
