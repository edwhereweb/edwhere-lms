import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';

export async function DELETE(
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
      }
    });

    if (!courseModule) {
      return new NextResponse('Not found', { status: 404 });
    }

    // Unassign chapters from this module instead of deleting them outright
    await db.chapter.updateMany({
      where: { moduleId: params.moduleId },
      data: { moduleId: null }
    });

    const deletedModule = await db.module.delete({
      where: {
        id: params.moduleId
      }
    });

    return NextResponse.json(deletedModule);
  } catch (error) {
    console.log('[MODULE_ID_DELETE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { courseId: string; moduleId: string } }
) {
  try {
    const { userId } = await auth();
    const { isPublished: _isPublished, ...values } = await req.json();

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    const courseModule = await db.module.update({
      where: {
        id: params.moduleId,
        courseId: params.courseId
      },
      data: {
        ...values
      }
    });

    return NextResponse.json(courseModule);
  } catch (error) {
    console.log('[MODULE_ID_PATCH]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function GET(
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
          orderBy: {
            position: 'asc'
          }
        }
      }
    });

    if (!courseModule) return new NextResponse('Not Found', { status: 404 });

    return NextResponse.json(courseModule);
  } catch (error) {
    console.log('[MODULE_ID_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
