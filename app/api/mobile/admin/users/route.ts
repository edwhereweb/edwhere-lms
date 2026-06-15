import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';
import { type MemberRole } from '@prisma/client';

const VALID_ROLES: MemberRole[] = ['ADMIN', 'TEACHER', 'STUDENT', 'MARKETER', 'BLOGGER'];

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const profile = await currentProfile();
    if (!profile || profile.role !== 'ADMIN') {
      return mobileError('FORBIDDEN', 'Forbidden', 403);
    }

    const { searchParams } = new URL(req.url);
    const roleParam = searchParams.get('role');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};

    if (roleParam && VALID_ROLES.includes(roleParam as MemberRole)) {
      where.role = roleParam as MemberRole;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const profiles = await db.profile.findMany({
      where,
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        imageUrl: true,
        role: true,
        createdAt: true,
        lastLoginAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const result = profiles.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      lastLoginAt: p.lastLoginAt ? p.lastLoginAt.toISOString() : null
    }));

    return mobileSuccess(result);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_USERS', error);
  }
}
