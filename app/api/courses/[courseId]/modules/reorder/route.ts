import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';

export async function PUT(req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = await auth();
    const { list } = await req.json();

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    for (const item of list) {
      await db.module.update({
        where: { id: item.id },
        data: { position: item.position }
      });
    }

    return new NextResponse('Success', { status: 200 });
  } catch (error) {
    console.log('[MODULES_REORDER]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
