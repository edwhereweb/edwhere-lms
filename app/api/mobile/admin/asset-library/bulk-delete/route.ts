import { auth } from '@clerk/nextjs/server';
import {
  mobileSuccess,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';
import { z } from 'zod';

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'At least one id is required')
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const profile = await currentProfile();
    if (!profile || profile.role !== 'ADMIN') {
      return mobileError('FORBIDDEN', 'Forbidden', 403);
    }

    const body = await req.json();
    const result = validateMobileBody(bulkDeleteSchema, body);
    if (!result.success) return result.response;

    const deleteResult = await db.chapter.deleteMany({
      where: {
        id: { in: result.data.ids },
        isLibraryAsset: true
      }
    });

    return mobileSuccess({ deleted: deleteResult.count });
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_ASSET_BULK_DELETE', error);
  }
}
