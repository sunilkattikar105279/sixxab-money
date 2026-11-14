import { Header, Footer } from '@/components/Header';

export default function Levels() {
  return (
    <>
      <Header active="Levels" />
      <main className="wrap">
        <section className="bar"><span className="tag gold">Educational scenarios</span><span style={{ flex: '1 1 480px' }}>Weekly trend, daily break levels, 4-hour zones and 1-hour triggers for SPX and QQQ, as if/then scenarios. Levels can fail. Not a recommendation.</span></section>
        <div className="grid">
          <section className="card"><h2>SPX</h2><p className="muted">Filled each weekday at 7:30 AM CST by the levels job (same data as the daily brief reel).</p></section>
          <section className="card"><h2>QQQ</h2><p className="muted">Filled each weekday at 7:30 AM CST by the levels job.</p></section>
          <section className="card"><h2>Nifty 50</h2><p className="muted">Held until SIXXAB Money is a SEBI-registered research analyst. Until then, India levels are not shown.</p></section>
        </div>
        <Footer note="US index levels only · educational scenarios, not a recommendation" />
      </main>
    </>
  );
}
