import type { MetadataRoute } from 'next';

import { db } from '@/lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://learn.edwhere.com';

  const publishedCourses = await db.course.findMany({
    where: { isPublished: true },
    select: { id: true, updatedAt: true }
  });

  const courseEntries: MetadataRoute.Sitemap = publishedCourses.map((course) => ({
    url: `${baseUrl}/courses/${course.id}`,
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
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9
    },
    ...courseEntries
  ];
}
