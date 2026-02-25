import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { currentProfile } from '@/lib/current-profile';
import { apiError, handleApiError } from '@/lib/api-utils';

interface Params {
  params: { courseId: string };
}

// POST /api/courses/[courseId]/messages/read-student
export async function POST(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await currentProfile();
    if (!profile) return apiError('Unauthorized', 401);

    await db.studentLastRead.upsert({
      where: {
        studentId_courseId: {
          studentId: profile.id,
          courseId: params.courseId
        }
      },
      update: { lastReadAt: new Date() },
      create: {
        studentId: profile.id,
        courseId: params.courseId,
        lastReadAt: new Date()
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError('MESSAGES_READ_STUDENT_POST', error);
  }
}
