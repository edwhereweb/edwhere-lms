import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';

type Params = { params: Promise<{ certificateId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const profile = await currentProfile();
    if (!profile || profile.role !== 'ADMIN') {
      return mobileError('FORBIDDEN', 'Forbidden', 403);
    }

    const { certificateId } = await params;

    const certificate = await db.certificate.findUnique({ where: { id: certificateId } });
    if (!certificate) return mobileError('NOT_FOUND', 'Certificate not found', 404);

    await db.certificate.delete({ where: { id: certificateId } });

    return mobileSuccess({ success: true });
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_CERTIFICATES_DELETE', error);
  }
}
