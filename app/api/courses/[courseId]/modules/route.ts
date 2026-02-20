import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';

export async function POST(req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = await auth();
    const { title } = await req.json();

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    const lastModule = await db.module.findFirst({
      where: {
        courseId: params.courseId
      },
      orderBy: {
        position: 'desc'
      }
    });

    const newPosition = lastModule ? lastModule.position + 1 : 1;

    const courseModule = await db.module.create({
      data: {
        title,
        courseId: params.courseId,
        position: newPosition
      }
    });

    return NextResponse.json(courseModule);
  } catch (error) {
    console.log('[MODULES]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
