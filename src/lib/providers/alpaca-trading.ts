// Owner-only broker link: sends auto-trade orders to the operator's own Alpaca account.
// Off unless SIXXAB_LIVE_TRADING=true. Defaults to Alpaca's paper-trading endpoint; real money needs
// ALPACA_TRADING_URL=https://api.alpaca.markets set deliberately. Public members always trade on paper.

export const liveTradingEnabled = () => process.env.SIXXAB_LIVE_TRADING === 'true' && !!process.env.ALPACA_KEY_ID && !!process.env.ALPACA_SECRET_KEY;
export const tradingUrl = () => process.env.ALPACA_TRADING_URL ?? 'https://paper-api.alpaca.markets';
export const isRealMoney = () => !tradingUrl().includes('paper-api');

export async function submitBracket(o: { symbol: string; qty: number; side: 'long' | 'short'; entry: number; stop: number; target: number }): Promise<string> {
  const res = await fetch(`${tradingUrl()}/v2/orders`, {
    method: 'POST',
    headers: { 'APCA-API-KEY-ID': process.env.ALPACA_KEY_ID!, 'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY!, 'content-type': 'application/json' },
    body: JSON.stringify({
      symbol: o.symbol.replace('.', '/'), qty: String(o.qty), side: o.side === 'long' ? 'buy' : 'sell',
      type: 'limit', limit_price: o.entry.toFixed(2), time_in_force: 'gtc', order_class: 'bracket',
      take_profit: { limit_price: o.target.toFixed(2) }, stop_loss: { stop_price: o.stop.toFixed(2) },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j?.message ?? `HTTP ${res.status}`);
  return String(j.id);
}
