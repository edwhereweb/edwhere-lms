import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import {
  mobileSuccess,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';

type Params = { params: Promise<{ userId: string }> };

const roleUpdateSchema = z.object({
  role: z.enum(['ADMIN', 'TEACHER', 'STUDENT', 'MARKETER', 'BLOGGER'])
});

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { userId: authUserId } = await auth();
    if (!authUserId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const adminProfile = await currentProfile();
    if (!adminProfile || adminProfile.role !== 'ADMIN') {
      return mobileError('FORBIDDEN', 'Forbidden', 403);
    }

    const { userId: targetUserId } = await params;
    const body = await req.json();

    const validation = validateMobileBody(roleUpdateSchema, body);
    if (!validation.success) return validation.response;

    const targetProfile = await db.profile.findUnique({
      where: { userId: targetUserId }
    });
    if (!targetProfile) return mobileError('NOT_FOUND', 'User not found', 404);

    const updated = await db.profile.update({
      where: { userId: targetUserId },
      data: { role: validation.data.role }
    });

    return mobileSuccess({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      lastLoginAt: updated.lastLoginAt ? updated.lastLoginAt.toISOString() : null
    });
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_USER_ROLE', error);
  }
}
