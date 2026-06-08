import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { apiError, validateBody, handleApiError } from '@/lib/api-utils';
import { resumeSchema } from '@/lib/validations';

type Params = { params: { courseId: string } };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const body = await req.json();
    const validation = validateBody(resumeSchema, body);
    if (!validation.success) return validation.response;

    const { chapterId } = validation.data;

    // Verify the chapter belongs to the course and is published
    const chapter = await db.chapter.findFirst({
      where: { id: chapterId, courseId: params.courseId, isPublished: true }
    });
    if (!chapter) return apiError('Chapter not found', 404);

    // Update the purchase record (student must be enrolled)
    const purchase = await db.purchase.findUnique({
      where: { userId_courseId: { userId, courseId: params.courseId } }
    });
    if (!purchase) return apiError('Not enrolled', 403);

    await db.purchase.update({
      where: { userId_courseId: { userId, courseId: params.courseId } },
      data: { lastVisitedChapterId: chapterId, lastVisitedAt: new Date() }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError('COURSE_RESUME', error);
  }
}
