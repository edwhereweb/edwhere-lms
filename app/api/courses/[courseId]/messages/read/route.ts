import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { currentProfile } from '@/lib/current-profile';
import { canEditCourse } from '@/lib/course-auth';
import { apiError, validateBody, handleApiError } from '@/lib/api-utils';
import { markReadSchema } from '@/lib/validations';

interface Params {
  params: { courseId: string };
}

// POST /api/courses/[courseId]/messages/read
export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canEditCourse(userId, params.courseId);
    if (!allowed) return apiError('Forbidden', 403);

    const profile = await currentProfile();
    if (!profile) return apiError('Unauthorized', 401);

    const body = await req.json();
    const validation = validateBody(markReadSchema, body);
    if (!validation.success) return validation.response;

    const studentEnrolled = await db.purchase.findFirst({
      where: { courseId: params.courseId, userId: validation.data.studentId }
    });
    if (!studentEnrolled) return apiError('Student is not enrolled in this course', 400);

    await db.mentorLastRead.upsert({
      where: {
        instructorId_courseId_studentId: {
          instructorId: profile.id,
          courseId: params.courseId,
          studentId: validation.data.studentId
        }
      },
      update: { lastReadAt: new Date() },
      create: {
        instructorId: profile.id,
        courseId: params.courseId,
        studentId: validation.data.studentId,
        lastReadAt: new Date()
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError('MESSAGES_READ_POST', error);
  }
}
