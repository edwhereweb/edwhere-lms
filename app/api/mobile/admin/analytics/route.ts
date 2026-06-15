import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { currentProfile } from '@/lib/current-profile';
import { getAnalytics } from '@/actions/get-analytics';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const profile = await currentProfile();
    if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'TEACHER')) {
      return mobileError('FORBIDDEN', 'Forbidden', 403);
    }

    const safeProfile = {
      ...profile,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
      lastLoginAt: profile.lastLoginAt ? profile.lastLoginAt.toISOString() : null
    };

    const analytics = await getAnalytics(userId, safeProfile);

    return mobileSuccess(analytics);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_ANALYTICS', error);
  }
}
