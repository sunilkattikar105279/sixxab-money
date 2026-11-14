import { Header, Footer } from '@/components/Header';
import { ScreenerView } from '@/components/ScreenerView';

export default function Screener() {
  return (
    <>
      <Header active="Screener" />
      <main className="wrap">
        <section className="bar"><span className="tag teal">Screener</span><span style={{ flex: '1 1 480px' }}>Every stock gets a 1–10 score from trend, breaks, accumulation, business results, news and industry strength. Each mode shows setups that meet its rules. Click a row to see why.</span></section>
        <ScreenerView />
        <Footer note="Data: Alpaca (US), Upstox (India), Twelve Data (global), SEC EDGAR (US results), Finnhub (US news)" />
      </main>
    </>
  );
}
