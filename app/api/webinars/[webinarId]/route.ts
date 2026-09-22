import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, handleApiError } from '@/lib/api-utils';

interface Params {
  params: { webinarId: string };
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const webinar = await db.webinar.findUnique({
      where: { id: params.webinarId, isPublished: true }
    });

    if (!webinar) return apiError('Webinar not found', 404);

    return NextResponse.json(webinar);
  } catch (error) {
    return handleApiError('WEBINAR_GET', error);
  }
}
