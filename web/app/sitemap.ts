import type { MetadataRoute } from 'next';

const routes = ['', '/privacy', '/terms', '/license'];

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `https://seek.mythx.art${route}`,
    lastModified: new Date('2026-05-01'),
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : 0.7,
  }));
}
