import { auth } from '@clerk/nextjs/server';
import { mobileError, handleMobileApiError, mobileSuccess } from '@/lib/api-mobile-utils';
import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const profile = await currentProfile();
    if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'TEACHER')) {
      return mobileError('FORBIDDEN', 'Forbidden', 403);
    }

    const now = new Date();

    const isAdmin = profile.role === 'ADMIN';

    const sessions = await db.offlineSession.findMany({
      where: {
        OR: [{ completedAt: { not: null } }, { scheduledAt: { lt: now } }],
        ...(isAdmin
          ? {}
          : {
              AND: {
                OR: [{ instructorId: userId }, { coInstructors: { some: { userId } } }]
              }
            })
      },
      include: {
        item: {
          include: {
            module: {
              include: {
                batch: { select: { title: true } }
              }
            }
          }
        }
      },
      orderBy: { scheduledAt: 'desc' }
    });

    const result = sessions.map((s) => ({
      id: s.id,
      title: s.item.title,
      batchName: s.item.module.batch.title,
      scheduledAt: s.scheduledAt.toISOString(),
      location: s.location,
      meetLink: s.meetLink
    }));

    return mobileSuccess(result);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_PAST_SESSIONS', error);
  }
}
