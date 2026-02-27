import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { handleApiError } from '@/lib/api-utils';
import { urlToR2Key, deleteObject } from '@/lib/r2';

export async function DELETE(
  req: Request,
  { params }: { params: { courseId: string; attachmentId: string } }
) {
  try {
    const { userId } = await auth();

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    const existing = await db.attachment.findUnique({
      where: {
        courseId: params.courseId,
        id: params.attachmentId
      }
    });
    if (!existing) {
      return new NextResponse('Not found', { status: 404 });
    }

    const r2Key = urlToR2Key(existing.url);
    if (r2Key) {
      try {
        await deleteObject(r2Key);
      } catch {
        // continue — object may already be gone
      }
    }

    const attachment = await db.attachment.delete({
      where: {
        courseId: params.courseId,
        id: params.attachmentId
      }
    });

    return NextResponse.json(attachment);
  } catch (error) {
    return handleApiError('ATTACHMENT_ID', error);
  }
}
