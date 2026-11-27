import type { Broker, BrokerOrder, SwingOrder } from './types';

// Alpaca for the owner's US account. Paper by default (https://paper-api.alpaca.markets); real money only when
// ALPACA_TRADING_URL=https://api.alpaca.markets is set deliberately. Trading keys can differ from the data keys:
// ALPACA_TRADING_KEY_ID / ALPACA_TRADING_SECRET_KEY, falling back to ALPACA_KEY_ID / ALPACA_SECRET_KEY.

const url = () => process.env.ALPACA_TRADING_URL ?? 'https://paper-api.alpaca.markets';
const keyId = () => process.env.ALPACA_TRADING_KEY_ID ?? process.env.ALPACA_KEY_ID ?? '';
const secret = () => process.env.ALPACA_TRADING_SECRET_KEY ?? process.env.ALPACA_SECRET_KEY ?? '';
export const alpacaConfigured = () => !!keyId() && !!secret();
export const alpacaIsPaper = () => url().includes('paper-api');

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${url()}${path}`, {
    ...init,
    headers: { 'APCA-API-KEY-ID': keyId(), 'APCA-API-SECRET-KEY': secret(), 'content-type': 'application/json', ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(15_000),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Alpaca ${path}: ${(j as { message?: string })?.message ?? res.status}`);
  return j as T;
}

interface AOrder { id: string; symbol: string; side: 'buy' | 'sell'; qty: string; status: string; limit_price: string | null; filled_qty: string; filled_avg_price: string | null }
const toOrder = (o: AOrder): BrokerOrder => ({ id: o.id, symbol: o.symbol.replace('/', '.'), side: o.side, qty: Number(o.qty), status: o.status, limitPrice: o.limit_price ? Number(o.limit_price) : null, filledQty: Number(o.filled_qty), filledAvg: o.filled_avg_price ? Number(o.filled_avg_price) : null });

export function alpacaBroker(): Broker {
  const paper = alpacaIsPaper();
  return {
    name: paper ? 'alpaca-paper' : 'alpaca', market: 'US', paper,
    async account() { const a = await call<{ equity: string; cash: string }>('/v2/account'); return { equity: Number(a.equity), cash: Number(a.cash), currency: 'USD' }; },
    async positions() {
      const p = await call<{ symbol: string; qty: string; avg_entry_price: string; current_price: string | null }[]>('/v2/positions');
      return p.map((x) => ({ symbol: x.symbol.replace('/', '.'), qty: Number(x.qty), avgPrice: Number(x.avg_entry_price), lastPrice: x.current_price ? Number(x.current_price) : null }));
    },
    async openOrders() { return (await call<AOrder[]>('/v2/orders?status=open&limit=200&nested=false')).map(toOrder); },
    async placeSwing(o: SwingOrder) {
      const j = await call<{ id: string }>('/v2/orders', {
        method: 'POST',
        body: JSON.stringify({
          symbol: o.symbol.replace('.', '/'), qty: String(o.qty), side: 'buy', type: 'limit', limit_price: o.entry.toFixed(2), time_in_force: 'gtc',
          order_class: 'bracket', take_profit: { limit_price: o.target.toFixed(2) }, stop_loss: { stop_price: o.stop.toFixed(2) },
          client_order_id: `sx-${o.symbol}-${Date.now()}`,
        }),
      });
      return j.id;
    },
    async order(id) { try { return toOrder(await call<AOrder>(`/v2/orders/${id}`)); } catch { return null; } },
  };
}
