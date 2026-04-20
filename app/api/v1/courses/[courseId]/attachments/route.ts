import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { checkCourseEdit } from '@/lib/course-auth';
import { attachmentSchema } from '@/lib/validations';
import { apiOk, validateRequest, handleRouteError } from '@/lib/api-response';

export async function POST(req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = await auth();

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    const body = await req.json();
    const validation = validateRequest(attachmentSchema, body);
    if (!validation.success) return validation.response;

    const { url, originalFilename } = validation.data;
    const name = originalFilename || url.split('/').pop() || 'Untitled';

    const attachment = await db.attachment.create({
      data: {
        url,
        name,
        courseId: params.courseId
      }
    });

    return apiOk(attachment);
  } catch (error) {
    return handleRouteError('COURSE_ID_ATTACHMENTS', error);
  }
}
