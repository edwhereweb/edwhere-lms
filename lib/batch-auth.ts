import { db } from '@/lib/db';

/**
 * Returns true if the given Clerk userId can create/update/delete batches.
 * Both ADMIN and TEACHER roles are permitted to manage batches.
 * Enrollment (adding students) is a separate check — see canEnrollInBatch.
 */
export async function canManageBatch(userId: string): Promise<boolean> {
  const profile = await db.profile.findUnique({ where: { userId }, select: { role: true } });
  return profile?.role === 'ADMIN' || profile?.role === 'TEACHER';
}

/**
 * Returns true if the given Clerk userId can enroll or remove students from a batch.
 * Per requirements, only ADMIN and TEACHER roles may enroll students — students cannot self-enroll.
 */
export async function canEnrollInBatch(userId: string): Promise<boolean> {
  const profile = await db.profile.findUnique({ where: { userId }, select: { role: true } });
  return profile?.role === 'ADMIN' || profile?.role === 'TEACHER';
}

/**
 * Returns true if the given Clerk userId is allowed to toggle allowSameDayOfflineSession on a Course.
 * This is an ADMIN-only capability.
 */
export async function canToggleSameDayOffline(userId: string): Promise<boolean> {
  const profile = await db.profile.findUnique({ where: { userId }, select: { role: true } });
  return profile?.role === 'ADMIN';
}
