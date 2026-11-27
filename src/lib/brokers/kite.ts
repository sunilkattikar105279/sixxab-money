import { createHash } from 'node:crypto';
import type { Broker, BrokerOrder, SwingOrder } from './types';

// Zerodha Kite Connect for the owner's India account (NSE, delivery/CNC, long only).
// Swing orders use GTTs, which last up to a year: a single-trigger GTT for the entry, then a two-leg (OCO) GTT
// for stop and target once the shares are in the demat account.
// SEBI's retail algo framework: orders must come from the owner's own API key and a static IP registered with
// Zerodha; we stay far below 10 orders a second (no exchange algo registration needed at that rate).
// Kite access tokens expire every morning, so the owner logs in once a day (owner-only /api/broker/kite/login).

const BASE = 'https://api.kite.trade';
export const kiteConfigured = () => !!process.env.KITE_API_KEY && !!process.env.KITE_API_SECRET;
const sym = (s: string) => s.replace(/\.NS$/i, '').toUpperCase();
const tick = (x: number) => Math.round(x * 20) / 20; // NSE tick size 0.05

export function kiteLoginUrl(): string { return `https://kite.zerodha.com/connect/login?v=3&api_key=${encodeURIComponent(process.env.KITE_API_KEY ?? '')}`; }

/** Exchange the request_token from the login redirect for the day's access token. */
export async function kiteSession(requestToken: string): Promise<{ accessToken: string; userId: string }> {
  const key = process.env.KITE_API_KEY!, secret = process.env.KITE_API_SECRET!;
  const checksum = createHash('sha256').update(key + requestToken + secret).digest('hex');
  const res = await fetch(`${BASE}/session/token`, { method: 'POST', headers: { 'X-Kite-Version': '3', 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ api_key: key, request_token: requestToken, checksum }) });
  const j = (await res.json().catch(() => ({}))) as { data?: { access_token: string; user_id: string }; message?: string };
  if (!res.ok || !j.data) throw new Error(`Kite session: ${j.message ?? res.status}`);
  return { accessToken: j.data.access_token, userId: j.data.user_id };
}

export function kiteBroker(accessToken: string, opts: { paper?: boolean } = {}): Broker {
  const auth = { 'X-Kite-Version': '3', Authorization: `token ${process.env.KITE_API_KEY}:${accessToken}` };
  async function call<T>(path: string, form?: Record<string, string>): Promise<T> {
    const res = await fetch(`${BASE}${path}`, form
      ? { method: 'POST', headers: { ...auth, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(form), signal: AbortSignal.timeout(15_000) }
      : { headers: auth, signal: AbortSignal.timeout(15_000) });
    const j = (await res.json().catch(() => ({}))) as { data?: T; message?: string };
    if (!res.ok || j.data === undefined) throw new Error(`Kite ${path}: ${j.message ?? res.status}`);
    return j.data;
  }
  const ltp = async (s: string) => (await call<Record<string, { last_price: number }>>(`/quote/ltp?i=NSE:${sym(s)}`))[`NSE:${sym(s)}`]?.last_price ?? null;
  interface KOrder { order_id: string; tradingsymbol: string; transaction_type: 'BUY' | 'SELL'; quantity: number; status: string; price: number; filled_quantity: number; average_price: number }
  const toOrder = (o: KOrder): BrokerOrder => ({ id: o.order_id, symbol: o.tradingsymbol, side: o.transaction_type === 'BUY' ? 'buy' : 'sell', qty: o.quantity, status: o.status, limitPrice: o.price || null, filledQty: o.filled_quantity, filledAvg: o.average_price || null });
  const paper = !!opts.paper;
  const refuse = () => { throw new Error('Kite paper mode: orders are simulated, not sent'); };
  return {
    name: paper ? 'kite-paper' : 'kite', market: 'IN', paper,
    async account() { const m = await call<{ net: number; available: { cash: number } }>('/user/margins/equity'); return { equity: m.net, cash: m.available.cash, currency: 'INR' }; },
    async positions() {
      const h = await call<{ tradingsymbol: string; quantity: number; t1_quantity: number; average_price: number; last_price: number }[]>('/portfolio/holdings');
      return h.filter((x) => x.quantity + x.t1_quantity > 0).map((x) => ({ symbol: x.tradingsymbol, qty: x.quantity + x.t1_quantity, avgPrice: x.average_price, lastPrice: x.last_price }));
    },
    async openOrders() { return (await call<KOrder[]>('/orders')).filter((o) => ['OPEN', 'TRIGGER PENDING', 'AMO REQ RECEIVED'].includes(o.status)).map(toOrder); },
    async placeSwing(o: SwingOrder) {
      if (paper) refuse();
      const last = await ltp(o.symbol);
      if (last === null) throw new Error(`Kite: no price for ${o.symbol}`);
      const condition = { exchange: 'NSE', tradingsymbol: sym(o.symbol), trigger_values: [tick(o.entry)], last_price: last };
      const orders = [{ exchange: 'NSE', tradingsymbol: sym(o.symbol), transaction_type: 'BUY', quantity: o.qty, order_type: 'LIMIT', product: 'CNC', price: tick(o.entry) }];
      const r = await call<{ trigger_id: number }>('/gtt/triggers', { type: 'single', condition: JSON.stringify(condition), orders: JSON.stringify(orders) });
      return `gtt:${r.trigger_id}`;
    },
    async protect(o) {
      if (paper) refuse();
      const s = sym(o.symbol);
      const condition = { exchange: 'NSE', tradingsymbol: s, trigger_values: [tick(o.stop), tick(o.target)], last_price: o.lastPrice };
      const orders = [
        { exchange: 'NSE', tradingsymbol: s, transaction_type: 'SELL', quantity: o.qty, order_type: 'LIMIT', product: 'CNC', price: tick(o.stop * 0.995) }, // a little below the stop so it fills in a fast fall
        { exchange: 'NSE', tradingsymbol: s, transaction_type: 'SELL', quantity: o.qty, order_type: 'LIMIT', product: 'CNC', price: tick(o.target) },
      ];
      const r = await call<{ trigger_id: number }>('/gtt/triggers', { type: 'two-leg', condition: JSON.stringify(condition), orders: JSON.stringify(orders) });
      return `gtt:${r.trigger_id}`;
    },
    async order(id) {
      try {
        if (id.startsWith('gtt:')) {
          const g = await call<{ id: number; status: string; orders: { result?: { order_result?: { order_id?: string } } }[] }>(`/gtt/triggers/${id.slice(4)}`);
          return { id, symbol: '', side: 'buy', qty: 0, status: `gtt-${g.status}`, limitPrice: null, filledQty: 0, filledAvg: null };
        }
        const hist = await call<KOrder[]>(`/orders/${id}`); const last = hist.at(-1); return last ? toOrder(last) : null;
      } catch { return null; }
    },
  };
}
