import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { reorderChaptersSchema } from '@/lib/validations';
import { validateBody, handleApiError } from '@/lib/api-utils';

export async function PUT(req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = await auth();

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    const body = await req.json();
    const validation = validateBody(reorderChaptersSchema, body);
    if (!validation.success) return validation.response;

    await Promise.all(
      validation.data.list.map((item) =>
        db.chapter.update({
          where: { id: item.id, courseId: params.courseId },
          data: { position: item.position }
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError('REORDER', error);
  }
}
