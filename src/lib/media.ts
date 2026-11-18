// SIXXAB Money video library: reels already published on Instagram (@sixxab_money, @sunil.kattikar).
// Pages embed them with Instagram's official embed; the nightly job can add new rows to the `videos` table.
import { adminClient } from './supabase/admin';

export type VideoTopic = 'daily-brief' | 'story' | 'economy' | 'markets' | 'habits' | 'investing' | 'ai';
export interface Video { id: string; url: string; title: string; date: string; topics: VideoTopic[]; stages?: number[]; account: 'sixxab_money' | 'sunil.kattikar' }

export const LIBRARY: Video[] = [
  { id: 'brief-1117', url: 'https://www.instagram.com/reel/Df2EFFXARs7/', title: 'Daily brief: Chips drag the S&P down 1.9%', date: '2026-11-17', topics: ['daily-brief', 'markets'], account: 'sixxab_money' },
  { id: 'brief-1116', url: 'https://www.instagram.com/reel/DfzfiQPGR8e/', title: 'Daily brief: Best week since August, S&P on its 20-week line', date: '2026-11-16', topics: ['daily-brief', 'markets'], account: 'sixxab_money' },
  { id: 'nvda-story', url: 'https://www.instagram.com/reel/DftD2yqjzwf/', title: 'The Jensen Huang story: wins, falls, mistakes, lessons', date: '2026-11-14', topics: ['story', 'markets'], account: 'sixxab_money' },
  { id: 'brief-1113', url: 'https://www.instagram.com/reel/Dfr_hLKAoOB/', title: 'Daily brief: Nvidia’s CEO quits, S&P slips under its 20-week', date: '2026-11-13', topics: ['daily-brief', 'markets'], account: 'sixxab_money' },
  { id: 'brief-1113b', url: 'https://www.instagram.com/reel/Dfr8Y8hjJk5/', title: 'Nvidia’s CEO quits: the market barely blinks', date: '2026-11-13', topics: ['daily-brief', 'markets'], account: 'sixxab_money' },
  { id: 'brief-1112', url: 'https://www.instagram.com/reel/DfnrKuljkSs/', title: 'Tuesday’s inflation scare, erased in one day', date: '2026-11-12', topics: ['daily-brief', 'economy'], account: 'sixxab_money' },
  { id: 'brief-1111', url: 'https://www.instagram.com/reel/DflQdvYnF0P/', title: 'Prices rose 0.4% in one month, hotter than forecast', date: '2026-11-11', topics: ['daily-brief', 'economy'], account: 'sixxab_money' },
  { id: 'qqq-1110', url: 'https://www.instagram.com/reel/Dfkji17k_-l/', title: 'QQQ’s worst day since 2020, right on the −15% line', date: '2026-11-10', topics: ['markets'], account: 'sixxab_money' },
  { id: 'nvda-6t', url: 'https://www.instagram.com/reel/DfRWFM_qjRX/', title: 'Nvidia: the AI boom’s engine, or its fault line?', date: '2026-11-03', topics: ['markets', 'ai'], account: 'sixxab_money' },
  { id: 'crash-10y', url: 'https://www.instagram.com/reel/DfQRk45KuKZ/', title: 'Does Wall Street really crash every ten years?', date: '2026-11-02', topics: ['investing', 'markets'], stages: [3, 4], account: 'sixxab_money' },
  { id: 'wants', url: 'https://www.instagram.com/reel/DeUd3RCAXLH/', title: 'Review your Wants spending', date: '2026-10-10', topics: ['habits'], stages: [1, 2], account: 'sixxab_money' },
  { id: '66-days', url: 'https://www.instagram.com/reel/DeR5GGuAJS4/', title: '66 days to build a habit, budgeting included', date: '2026-10-09', topics: ['habits'], stages: [1, 2], account: 'sixxab_money' },
  { id: '24-hour', url: 'https://www.instagram.com/reel/DeMvdU9gDrP/', title: 'The 24-hour rule before any purchase over $50', date: '2026-10-07', topics: ['habits'], stages: [1, 2], account: 'sixxab_money' },
  { id: 'leaks', url: 'https://www.instagram.com/reel/DeHRRtiAl9a/', title: 'You can’t out-earn bad money habits', date: '2026-10-05', topics: ['habits'], stages: [2, 3], account: 'sixxab_money' },
  { id: 'net-worth', url: 'https://www.instagram.com/reel/DeFxIpBib2O/', title: 'Your net worth trend this month', date: '2026-10-04', topics: ['habits', 'investing'], stages: [3, 4], account: 'sixxab_money' },
  { id: 'bill', url: 'https://www.instagram.com/reel/DeCcPc9giH9/', title: 'Negotiate one bill this week', date: '2026-10-03', topics: ['habits'], stages: [2], account: 'sixxab_money' },
  { id: 'sp-10', url: 'https://www.instagram.com/reel/Dd_3iBBgtEm/', title: 'The S&P 500’s long-run average return', date: '2026-10-02', topics: ['investing'], stages: [3, 4], account: 'sixxab_money' },
  { id: 'budget-freedom', url: 'https://www.instagram.com/reel/Dd1PusTFIqj/', title: 'A budget is a plan for your freedom', date: '2026-09-28', topics: ['habits'], stages: [1, 2], account: 'sixxab_money' },
  { id: 'agent-reel', url: 'https://www.instagram.com/reel/Dfkp3Q5t7v8/', title: 'My last reel posted itself: the agent workflow', date: '2026-11-11', topics: ['ai'], account: 'sunil.kattikar' },
  { id: 'ai-jobs', url: 'https://www.instagram.com/reel/DfItnOzx5fe/', title: 'AI isn’t taking your job; someone who uses AI is', date: '2026-10-30', topics: ['ai'], account: 'sunil.kattikar' },
];

/** Agent promo reels linked from the home page cards (ids 'quant' and 'delta'); add an entry once each promo is posted. */
export interface Promo { id: 'coach' | 'quant' | 'delta'; url: string; poster: string; title: string }
const VM = 'https://media.viewmax.io/users/5CsPXUOC6B2P2tCfo9UCiuCFJXw4Limz/sora-videos/';
export const PROMOS: Promo[] = [
  { id: 'coach', url: `${VM}cgt-20261118211156-xeg6d/6e5ed2e8-7853-4009-935e-01f56ecebacf.mp4`, poster: `${VM}cgt-20261118211156-xeg6d/6fcc2eae-5d9a-4fd9-a06f-182e8a21c974.first.jpg`, title: 'Your personal money coach in 15 seconds' },
  { id: 'quant', url: `${VM}cgt-20261118210145-dmias/dd4b90ba-1d0d-473b-98db-93dd6c2525a3.mp4`, poster: `${VM}cgt-20261118210145-dmias/091220dd-b264-479d-8162-1bc45c04a435.first.jpg`, title: 'Quant screener in 15 seconds' },
  { id: 'delta', url: `${VM}cgt-20261118210153-9airt/b287721e-fdc3-4a01-9871-bed223abf654.mp4`, poster: `${VM}cgt-20261118210153-9airt/c9a979b4-04e7-4749-88a5-03276e8d66c5.first.jpg`, title: 'Delta money-move manager in 15 seconds' },
];

export async function videos(filter: { topic?: VideoTopic; stage?: number; limit?: number } = {}): Promise<Video[]> {
  let list = LIBRARY;
  const db = adminClient();
  if (db) {
    const { data } = await db.from('videos').select('id, url, title, date, topics, stages, account').eq('published', true).order('date', { ascending: false }).limit(100);
    if (data && data.length) {
      const ids = new Set(data.map((d) => d.id));
      list = [...(data as Video[]), ...LIBRARY.filter((v) => !ids.has(v.id))];
    }
  }
  return list
    .filter((v) => (!filter.topic || v.topics.includes(filter.topic)) && (!filter.stage || (v.stages ?? []).includes(filter.stage)))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, filter.limit ?? 50);
}

/** Word-overlap search used by the agents' find_videos tool. */
export async function searchVideos(query: string, limit = 2): Promise<Video[]> {
  const words = query.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const all = await videos();
  return all
    .map((v) => ({ v, s: words.filter((w) => (v.title + ' ' + v.topics.join(' ')).toLowerCase().includes(w)).length }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.v.date.localeCompare(a.v.date))
    .slice(0, limit)
    .map((x) => x.v);
}
