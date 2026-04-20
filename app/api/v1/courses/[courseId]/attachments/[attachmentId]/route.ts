import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { apiOk, apiErr, handleRouteError } from '@/lib/api-response';
import { urlToR2Key, deleteObject } from '@/lib/r2';

export async function DELETE(
  _req: Request,
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
      return apiErr('NOT_FOUND', 'Not found', 404);
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

    return apiOk(attachment);
  } catch (error) {
    return handleRouteError('ATTACHMENT_ID', error);
  }
}
