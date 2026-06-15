import { auth } from '@clerk/nextjs/server';
import {
  mobileSuccess,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { isTeacher } from '@/lib/teacher';
import { approveUploadSchema } from '@/lib/validations';

type Params = { params: Promise<{ uploadId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const teacherAccess = await isTeacher();
    if (!teacherAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const { uploadId } = await params;

    const body = await req.json();
    const result = validateMobileBody(approveUploadSchema, body);
    if (!result.success) return result.response;

    const upload = await db.sessionUpload.findUnique({ where: { id: uploadId } });
    if (!upload) return mobileError('NOT_FOUND', 'Upload not found', 404);

    if (result.data.action === 'APPROVE') {
      const updated = await db.sessionUpload.update({
        where: { id: uploadId },
        data: {
          status: 'APPROVED',
          approvedBy: userId,
          approvedAt: new Date()
        }
      });
      return mobileSuccess(updated);
    }

    const updated = await db.sessionUpload.update({
      where: { id: uploadId },
      data: { status: 'REJECTED' }
    });

    return mobileSuccess(updated);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_SESSION_UPLOAD_REVIEW', error);
  }
}
