import { auth } from '@clerk/nextjs/server';
import {
  mobileCreated,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { attachmentSchema } from '@/lib/validations';

type Params = { params: Promise<{ courseId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { courseId } = await params;
    const denied = await checkCourseEdit(userId, courseId);
    if (denied) return denied;

    const body = await req.json();
    const result = validateMobileBody(attachmentSchema, body);
    if (!result.success) return result.response;

    const name = result.data.originalFilename || result.data.url.split('/').pop() || 'attachment';

    const attachment = await db.attachment.create({
      data: {
        url: result.data.url,
        name,
        courseId
      }
    });

    return mobileCreated(attachment);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_ATTACHMENT_CREATE', error);
  }
}
