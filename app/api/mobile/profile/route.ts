import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { apiError, handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import type { SafeProfile } from '@/types';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    // Extract client IP from headers (non-critical)
    let clientIp = 'Unknown IP';
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : realIp || 'Unknown IP';

    let currentProfile = await db.profile.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        name: true,
        imageUrl: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        lastLoginIp: true
      }
    });

    if (!currentProfile) {
      const clerkUser = await currentUser();
      if (!clerkUser) return apiError('Unauthorized', 401);

      currentProfile = await db.profile.create({
        data: {
          userId,
          name:
            `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim() ||
            clerkUser.username ||
            'User',
          imageUrl: clerkUser.imageUrl ?? '',
          email: (clerkUser.emailAddresses[0]?.emailAddress ?? '').toLowerCase(),
          lastLoginAt: new Date(),
          lastLoginIp: clientIp
        },
        select: {
          id: true,
          userId: true,
          name: true,
          imageUrl: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          lastLoginIp: true
        }
      });
    } else {
      const anHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const isStaleLogin = !currentProfile.lastLoginAt || currentProfile.lastLoginAt < anHourAgo;
      const isNewIp = currentProfile.lastLoginIp !== clientIp;

      if (isStaleLogin || isNewIp) {
        const clerkUser = await currentUser();
        const freshName = clerkUser
          ? `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim() ||
            clerkUser.username ||
            currentProfile.name
          : currentProfile.name;
        const freshImageUrl = clerkUser?.imageUrl ?? currentProfile.imageUrl;

        currentProfile = await db.profile.update({
          where: { id: currentProfile.id },
          data: {
            lastLoginAt: new Date(),
            lastLoginIp: clientIp,
            name: freshName,
            imageUrl: freshImageUrl
          },
          select: {
            id: true,
            userId: true,
            name: true,
            imageUrl: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            lastLoginAt: true,
            lastLoginIp: true
          }
        });
      }
    }

    const safeProfile: SafeProfile = {
      ...currentProfile,
      createdAt: currentProfile.createdAt.toISOString(),
      updatedAt: currentProfile.updatedAt.toISOString(),
      lastLoginAt: currentProfile.lastLoginAt ? currentProfile.lastLoginAt.toISOString() : null
    };

    return NextResponse.json(safeProfile);
  } catch (error) {
    return handleApiError('MOBILE_PROFILE', error);
  }
}
