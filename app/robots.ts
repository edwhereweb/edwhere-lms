import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://learn.edwhere.com';

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
