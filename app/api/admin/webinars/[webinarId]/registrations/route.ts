import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, handleApiError } from '@/lib/api-utils';

interface Params {
  params: { webinarId: string };
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile || profile.role !== 'ADMIN') return apiError('Forbidden', 403);

    const registrations = await db.webinarRegistration.findMany({
      where: { webinarId: params.webinarId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(registrations);
  } catch (error) {
    return handleApiError('ADMIN_WEBINAR_REGISTRATIONS_GET', error);
  }
}
