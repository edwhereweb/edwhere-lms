import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { validateBody, handleApiError } from '@/lib/api-utils';
import { reorderModulesSchema } from '@/lib/validations';

export async function PUT(req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = await auth();

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    const body = await req.json();
    const validation = validateBody(reorderModulesSchema, body);
    if (!validation.success) return validation.response;

    for (const item of validation.data.list) {
      await db.module.update({
        where: { id: item.id },
        data: { position: item.position }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError('MODULES_REORDER', error);
  }
}
