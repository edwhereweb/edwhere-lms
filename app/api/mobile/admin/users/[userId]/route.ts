import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';

type Params = { params: Promise<{ userId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId: authUserId } = await auth();
    if (!authUserId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const adminProfile = await currentProfile();
    if (!adminProfile || adminProfile.role !== 'ADMIN') {
      return mobileError('FORBIDDEN', 'Forbidden', 403);
    }

    const { userId: targetUserId } = await params;

    const profile = await db.profile.findUnique({
      where: { userId: targetUserId }
    });
    if (!profile) return mobileError('NOT_FOUND', 'User not found', 404);

    return mobileSuccess({
      ...profile,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
      lastLoginAt: profile.lastLoginAt ? profile.lastLoginAt.toISOString() : null
    });
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_USER_DETAIL', error);
  }
}
