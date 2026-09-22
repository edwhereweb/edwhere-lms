import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/api-utils';

export async function GET() {
  try {
    const webinars = await db.webinar.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        bannerUrl: true,
        scheduledAt: true,
        durationMinutes: true,
        presenterName: true,
        presenterPhotoUrl: true,
        _count: { select: { registrations: true } }
      },
      orderBy: { scheduledAt: 'asc' }
    });

    return NextResponse.json(webinars);
  } catch (error) {
    return handleApiError('WEBINARS_GET', error);
  }
}
