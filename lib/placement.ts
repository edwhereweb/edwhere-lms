import { db } from '@/lib/db';

/**
 * Returns true if the given Clerk userId has ADMIN or TEACHER role,
 * which is required to manage companies, jobs, and view all applications.
 */
export async function canManagePlacement(userId: string): Promise<boolean> {
  const profile = await db.profile.findUnique({ where: { userId }, select: { role: true } });
  return profile?.role === 'ADMIN' || profile?.role === 'TEACHER';
}

/**
 * Returns the PlacementUser record for the given Clerk userId, or null if not found.
 */
export async function getPlacementUser(userId: string) {
  return db.placementUser.findUnique({ where: { userId } });
}

/**
 * Returns true if the given Clerk userId is a registered placement user.
 */
export async function isPlacementUser(userId: string): Promise<boolean> {
  const record = await db.placementUser.findUnique({
    where: { userId },
    select: { id: true, isActive: true }
  });
  return !!record && record.isActive;
}
