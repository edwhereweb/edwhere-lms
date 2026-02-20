import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';

export async function PATCH(
  req: Request,
  { params }: { params: { courseId: string; moduleId: string } }
) {
  try {
    const { userId } = await auth();

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    const courseModule = await db.module.findUnique({
      where: {
        id: params.moduleId,
        courseId: params.courseId
      },
      include: {
        chapters: {
          where: {
            isPublished: true
          }
        }
      }
    });

    if (!courseModule) {
      return new NextResponse('Not found', { status: 404 });
    }

    // A module ideally shouldn't be published if it has 0 published chapters.
    if (!courseModule.title || courseModule.chapters.length === 0) {
      return new NextResponse('Missing required fields or no published chapters', { status: 400 });
    }

    const publishedModule = await db.module.update({
      where: {
        id: params.moduleId,
        courseId: params.courseId
      },
      data: {
        isPublished: true
      }
    });

    return NextResponse.json(publishedModule);
  } catch (error) {
    console.log('[MODULE_PUBLISH]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
