import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { apiError, handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';

// Admin-only: list all session uploads with PENDING status
export async function GET(_req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await db.profile.findUnique({ where: { userId }, select: { role: true } });
    if (profile?.role !== 'ADMIN') return apiError('Forbidden', 403);

    const pending = await db.sessionUpload.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: {
        session: {
          select: {
            scheduledAt: true,
            instructorId: true,
            item: {
              select: {
                title: true,
                module: {
                  select: {
                    title: true,
                    batch: { select: { id: true, title: true } }
                  }
                }
              }
            }
          }
        },
        logs: { where: { isLate: true }, orderBy: { uploadedAt: 'desc' } }
      }
    });

    return NextResponse.json(pending);
  } catch (error) {
    return handleApiError('GET_PENDING_UPLOADS', error);
  }
}
