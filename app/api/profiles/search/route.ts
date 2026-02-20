import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, handleApiError } from '@/lib/api-utils';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const myProfile = await db.profile.findUnique({ where: { userId } });
    if (!myProfile || !['ADMIN', 'TEACHER'].includes(myProfile.role)) {
      return apiError('Forbidden', 403);
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() ?? '';
    if (q.length < 1) return NextResponse.json([]);

    const allProfiles = await db.profile.findMany({
      where: { NOT: { userId } },
      select: {
        id: true,
        name: true,
        email: true,
        imageUrl: true,
        role: true
      },
      take: 200
    });

    const lower = q.toLowerCase();
    const results = allProfiles
      .filter((p) => p.name.toLowerCase().includes(lower) || p.email.toLowerCase().includes(lower))
      .slice(0, 10);

    return NextResponse.json(results);
  } catch (error) {
    return handleApiError('PROFILES_SEARCH', error);
  }
}
