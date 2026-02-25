import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { validateBody, handleApiError } from '@/lib/api-utils';
import { createModuleSchema } from '@/lib/validations';

export async function POST(req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = await auth();

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    const body = await req.json();
    const validation = validateBody(createModuleSchema, body);
    if (!validation.success) return validation.response;

    const lastModule = await db.module.findFirst({
      where: { courseId: params.courseId },
      orderBy: { position: 'desc' }
    });

    const newPosition = lastModule ? lastModule.position + 1 : 1;

    const courseModule = await db.module.create({
      data: {
        title: validation.data.title,
        courseId: params.courseId,
        position: newPosition
      }
    });

    return NextResponse.json(courseModule);
  } catch (error) {
    return handleApiError('MODULES', error);
  }
}
