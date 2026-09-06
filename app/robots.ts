import type { MetadataRoute } from 'next';
import { getPublicBaseUrl } from '@/lib/url-utils';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getPublicBaseUrl({ preferPublic: true });

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/teacher/', '/dashboard/']
      }
    ],
    sitemap: `${baseUrl}/sitemap.xml`
  };
}
