import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { createChapterSchema } from '@/lib/validations';
import { validateBody, handleApiError } from '@/lib/api-utils';

export async function POST(req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = await auth();

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    const body = await req.json();
    const validation = validateBody(createChapterSchema, body);
    if (!validation.success) return validation.response;

    const lastChapter = await db.chapter.findFirst({
      where: {
        courseId: params.courseId,
        moduleId: validation.data.moduleId || null
      },
      orderBy: { position: 'desc' }
    });

    const newPosition = lastChapter ? lastChapter.position + 1 : 1;

    const chapter = await db.chapter.create({
      data: {
        title: validation.data.title,
        courseId: params.courseId,
        moduleId: validation.data.moduleId || null,
        contentType: validation.data.contentType ?? 'VIDEO_MUX',
        position: newPosition
      }
    });

    return NextResponse.json(chapter);
  } catch (error) {
    return handleApiError('CHAPTERS', error);
  }
}
