import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { apiError, handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';

/**
 * PATCH /api/admin/placement/users/[profileId]
 *
 * Toggles placement portal access for a user identified by their Profile id.
 * - If no PlacementUser record exists yet, one is created with isActive = true.
 * - If one already exists, isActive is toggled.
 *
 * Only ADMINs may call this route.
 */
export async function PATCH(_req: Request, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const callerProfile = await db.profile.findUnique({
      where: { userId },
      select: { role: true }
    });
    if (callerProfile?.role !== 'ADMIN') return apiError('Forbidden', 403);

    const { profileId } = await params;

    const targetProfile = await db.profile.findUnique({
      where: { id: profileId },
      select: { userId: true, name: true, email: true }
    });
    if (!targetProfile) return apiError('User not found', 404);

    const existing = await db.placementUser.findUnique({
      where: { userId: targetProfile.userId }
    });

    if (!existing) {
      // Create with access enabled
      const created = await db.placementUser.create({
        data: {
          userId: targetProfile.userId,
          name: targetProfile.name,
          email: targetProfile.email,
          isActive: true
        }
      });
      return NextResponse.json({ placementUser: created, action: 'created' });
    }

    const updated = await db.placementUser.update({
      where: { userId: targetProfile.userId },
      data: { isActive: !existing.isActive }
    });

    return NextResponse.json({
      placementUser: updated,
      action: updated.isActive ? 'enabled' : 'disabled'
    });
  } catch (error) {
    return handleApiError('ADMIN_PLACEMENT_TOGGLE', error);
  }
}
