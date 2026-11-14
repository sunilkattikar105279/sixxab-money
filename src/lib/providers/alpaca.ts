// Alpaca market data (US). Free "Basic" plan: real-time IEX feed, ~7 years of history, 200 calls/min.
// Keys: https://app.alpaca.markets (paper account is enough). Free data is for development; a public site needs the paid SIP plan.
import type { Bar } from '../ta/bars';

const TF: Record<string, string> = { '1m': '1Min', '5m': '5Min', '15m': '15Min', '1h': '1Hour', '1d': '1Day' };

export async function alpacaBars(symbol: string, tf: '1m' | '5m' | '15m' | '1h' | '1d', startISO: string): Promise<Bar[]> {
  const id = process.env.ALPACA_KEY_ID, secret = process.env.ALPACA_SECRET_KEY;
  if (!id || !secret) return [];
  const out: Bar[] = []; let page: string | undefined;
  do {
    const u = new URL(`https://data.alpaca.markets/v2/stocks/${encodeURIComponent(symbol)}/bars`);
    u.searchParams.set('timeframe', TF[tf]); u.searchParams.set('start', startISO); u.searchParams.set('limit', '10000');
    u.searchParams.set('adjustment', 'all'); u.searchParams.set('feed', process.env.ALPACA_FEED || 'iex');
    if (page) u.searchParams.set('page_token', page);
    const res = await fetch(u, { headers: { 'APCA-API-KEY-ID': id, 'APCA-API-SECRET-KEY': secret }, cache: 'no-store' });
    if (!res.ok) break;
    const j = (await res.json()) as { bars?: { t: string; o: number; h: number; l: number; c: number; v: number }[]; next_page_token?: string };
    (j.bars ?? []).forEach((b) => out.push({ t: Date.parse(b.t), o: b.o, h: b.h, l: b.l, c: b.c, v: b.v }));
    page = j.next_page_token ?? undefined;
  } while (page);
  return out;
}
