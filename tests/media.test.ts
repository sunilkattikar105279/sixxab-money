import { describe, expect, it } from 'vitest';
import { searchVideos, videos, LIBRARY } from '@/lib/media';
import { runTool, toolSchemas } from '@/lib/agents/tools';
import { DOMAINS } from '@/lib/agents/domains';

describe('video library', () => {
  it('has valid Instagram links and unique ids', () => {
    expect(new Set(LIBRARY.map((v) => v.id)).size).toBe(LIBRARY.length);
    LIBRARY.forEach((v) => expect(v.url).toMatch(/^https:\/\/www\.instagram\.com\/reel\/[\w-]+\/$/));
  });
  it('filters by topic and stage, newest first', async () => {
    const briefs = await videos({ topic: 'daily-brief' });
    expect(briefs.length).toBeGreaterThan(0);
    expect(briefs[0].date >= briefs.at(-1)!.date).toBe(true);
    (await videos({ stage: 2 })).forEach((v) => expect(v.stages).toContain(2));
  });
  it('finds reels for a question', async () => {
    const r = await searchVideos('how do I build a budgeting habit');
    expect(r.length).toBeGreaterThan(0);
  });
});

describe('agent tools', () => {
  it('every tool an agent lists has a schema', () => {
    Object.values(DOMAINS).forEach((d) => expect(toolSchemas(d.tools)).toHaveLength(d.tools.length));
  });
  it('find_videos returns reels to show with the answer', async () => {
    const out = await runTool('find_videos', { query: 'inflation prices' }, {});
    expect(out.videos?.length).toBeGreaterThan(0);
  });
  it('data tools degrade gracefully without a database', async () => {
    const out = await runTool('get_stock_analysis', { market: 'US', symbol: 'NVDA' }, {});
    expect(out.data).toHaveProperty('error');
  });
});
