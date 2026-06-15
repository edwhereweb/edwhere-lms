import { auth } from '@clerk/nextjs/server';
import { mobileError, handleMobileApiError, mobileSuccess } from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { hasBatchAccess } from '@/lib/batch-auth';

type Params = { params: Promise<{ batchId: string; itemId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { batchId, itemId } = await params;

    const hasAccess = await hasBatchAccess(batchId, userId);
    if (!hasAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const uploads = await db.sessionUpload.findMany({
      where: { session: { itemId } },
      include: { logs: { orderBy: { uploadedAt: 'desc' } } },
      orderBy: { createdAt: 'desc' }
    });

    return mobileSuccess(uploads);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_SESSION_UPLOADS_GET', error);
  }
}
