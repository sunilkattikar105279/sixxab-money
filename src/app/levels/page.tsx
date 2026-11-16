import { Header, Footer } from '@/components/Header';
import { Reel } from '@/components/Reel';
import { videos } from '@/lib/media';

export default async function Levels() {
  const [latest] = await videos({ topic: 'daily-brief', limit: 1 });
  return (
    <>
      <Header active="Levels" />
      <main className="wrap" id="main">
        <section className="bar"><span className="tag gold">Educational scenarios</span><span style={{ flex: '1 1 480px' }}>Weekly trend, daily break levels, 4-hour zones and 1-hour triggers for SPX and QQQ, as if/then scenarios. Levels can fail. Not a recommendation.</span></section>
        <div className="grid">
          <section className="card"><h2>SPX</h2><p className="muted">Filled each weekday at 7:30 AM CST by the levels job (same data as the daily brief reel).</p></section>
          <section className="card"><h2>QQQ</h2><p className="muted">Filled each weekday at 7:30 AM CST by the levels job.</p></section>
          <section className="card"><h2>Nifty 50</h2><p className="muted">Held until SIXXAB Money is a SEBI-registered research analyst. Until then, India levels are not shown.</p></section>
        </div>
        {latest && <section className="card"><h2 style={{ marginBottom: 10 }}>Latest brief with levels</h2><Reel url={latest.url} title={latest.title} /></section>}
        <Footer note="US index levels only · educational scenarios, not a recommendation" />
      </main>
    </>
  );
}
