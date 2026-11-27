// One interface for the owner's real broker accounts. Swing orders only: a limit entry with a stop and a target.

export interface BrokerAccount { equity: number; cash: number; currency: 'USD' | 'INR' }
export interface BrokerPosition { symbol: string; qty: number; avgPrice: number; lastPrice: number | null }
export interface BrokerOrder { id: string; symbol: string; side: 'buy' | 'sell'; qty: number; status: string; limitPrice: number | null; filledQty: number; filledAvg: number | null }
export interface SwingOrder { symbol: string; qty: number; entry: number; stop: number; target: number }

export interface Broker {
  name: 'alpaca' | 'alpaca-paper' | 'kite' | 'kite-paper';
  market: 'US' | 'IN';
  paper: boolean;
  account(): Promise<BrokerAccount>;
  positions(): Promise<BrokerPosition[]>;
  openOrders(): Promise<BrokerOrder[]>;
  /** Places the entry. Alpaca attaches stop and target as a bracket; Kite needs protect() once filled. Returns the order id. */
  placeSwing(o: SwingOrder): Promise<string>;
  /** Adds the stop-and-target exit after a fill where the broker does not do it in one step (Kite GTT OCO). Returns the exit id. */
  protect?(o: SwingOrder & { lastPrice: number }): Promise<string>;
  order(id: string): Promise<BrokerOrder | null>;
}
