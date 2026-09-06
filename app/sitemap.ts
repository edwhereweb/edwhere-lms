import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { getPublicBaseUrl } from '@/lib/url-utils';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getPublicBaseUrl({ preferPublic: true });

  const publishedCourses = await db.course.findMany({
    where: { isPublished: true },
    select: { id: true, slug: true, updatedAt: true }
  });

  const courseEntries: MetadataRoute.Sitemap = publishedCourses.map((course) => ({
    url: `${baseUrl}/courses/${course.slug || course.id}`,
    lastModified: course.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0
    },
    {
      url: `${baseUrl}/courses`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9
    },
    ...courseEntries
  ];
}
