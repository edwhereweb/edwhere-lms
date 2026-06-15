import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { currentProfile } from '@/lib/current-profile';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const profile = await currentProfile();
    if (!profile) return mobileError('NOT_FOUND', 'Profile not found', 404);

    return mobileSuccess({
      id: profile.id,
      userId: profile.userId,
      name: profile.name,
      imageUrl: profile.imageUrl,
      email: profile.email,
      role: profile.role,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
      lastLoginAt: profile.lastLoginAt ? profile.lastLoginAt.toISOString() : null,
      lastLoginIp: profile.lastLoginIp
    });
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_PROFILE', error);
  }
}
