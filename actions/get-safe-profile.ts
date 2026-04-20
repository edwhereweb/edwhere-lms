import { db } from '@/lib/db';
import { logError } from '@/lib/debug';
import { SafeProfile } from '@/types';
import { headers } from 'next/headers';
import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function getSafeProfile() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return redirect('/sign-in');
    }

    // IP tracking is non-critical — wrap separately so a headers() failure
    // in some Vercel/edge request contexts doesn't abort the whole profile load.
    let clientIp = 'Unknown IP';
    try {
      const headersList = await headers();
      const forwardedFor = headersList.get('x-forwarded-for');
      const realIp = headersList.get('x-real-ip');
      clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : realIp || 'Unknown IP';
    } catch {
      // headers() unavailable in this context — skip IP tracking
    }

    let currentProfile = await db.profile.findUnique({
      where: {
        userId
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

    if (!currentProfile) {
      const clerkUser = await currentUser();
      if (!clerkUser) return redirect('/sign-in');

      currentProfile = await db.profile.create({
        data: {
          userId,
          name:
            `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim() ||
            clerkUser.username ||
            'User',
          imageUrl: clerkUser.imageUrl ?? '',
          email: clerkUser.emailAddresses[0]?.emailAddress ?? '',
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
      // Logic to conditionally update the login timestamp and IP
      const anHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const isStaleLogin = !currentProfile.lastLoginAt || currentProfile.lastLoginAt < anHourAgo;
      const isNewIp = currentProfile.lastLoginIp !== clientIp;

      if (isStaleLogin || isNewIp) {
        currentProfile = await db.profile.update({
          where: { id: currentProfile.id },
          data: {
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
      }
    }

    const safeProfile: SafeProfile = {
      ...currentProfile,
      createdAt: currentProfile.createdAt.toISOString(),
      updatedAt: currentProfile.updatedAt.toISOString(),
      lastLoginAt: currentProfile.lastLoginAt ? currentProfile.lastLoginAt.toISOString() : null
    };

    return safeProfile;
  } catch (error) {
    logError('GET_SAFE_PROFILE', error);
    return null;
  }
}
