import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { apiOk, apiErr, handleRouteError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

    const myProfile = await db.profile.findUnique({ where: { userId } });
    if (!myProfile || !['ADMIN', 'TEACHER'].includes(myProfile.role)) {
      return apiErr('FORBIDDEN', 'Forbidden', 403);
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() ?? '';
    if (q.length < 1) return apiOk([]);

    // Filter by role at DB level so we never miss a teacher due to a take() cap.
    const allProfiles = await db.profile.findMany({
      where: {
        NOT: { userId },
        role: { in: ['TEACHER', 'ADMIN'] }
      },
      select: {
        id: true,
        name: true,
        email: true,
        imageUrl: true,
        role: true
      },
      orderBy: { name: 'asc' }
    });

    const lower = q.toLowerCase();
    const results = allProfiles
      .filter((p) => p.name.toLowerCase().includes(lower) || p.email.toLowerCase().includes(lower))
      .slice(0, 10);

    return apiOk(results);
  } catch (error) {
    return handleRouteError('PROFILES_SEARCH', error);
  }
}
