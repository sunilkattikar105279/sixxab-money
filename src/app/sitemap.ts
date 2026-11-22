import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

const PAGES: [string, MetadataRoute.Sitemap[number]['changeFrequency'], number][] = [
  ['/', 'daily', 1], ['/login?join=1', 'monthly', 0.9], ['/screener', 'daily', 0.8], ['/maps', 'daily', 0.8], ['/economy', 'daily', 0.8],
  ['/world', 'daily', 0.7], ['/learn', 'weekly', 0.8], ['/journey', 'weekly', 0.9], ['/sectors', 'daily', 0.8], ['/metrics', 'daily', 0.5], ['/agents', 'monthly', 0.6], ['/levels', 'daily', 0.6], ['/sentiment', 'daily', 0.8], ['/history', 'monthly', 0.8], ['/credit', 'daily', 0.8], ['/ask', 'monthly', 0.6], ['/practice', 'weekly', 0.9], ['/practice/models', 'daily', 0.8], ['/practice/paper', 'monthly', 0.7], ['/practice/goals', 'monthly', 0.7],
  ['/legal/disclosures', 'yearly', 0.3], ['/legal/privacy', 'yearly', 0.3], ['/legal/terms', 'yearly', 0.3],
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map(([path, changeFrequency, priority]) => ({ url: `${SITE.url}${path}`, changeFrequency, priority, lastModified: new Date() }));
}
