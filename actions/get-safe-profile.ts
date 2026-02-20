import { db } from '@/lib/db';
import { SafeProfile } from '@/types';
import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function getSafeProfile() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return redirect('/sign-in');
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
        updatedAt: true
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
          email: clerkUser.emailAddresses[0]?.emailAddress ?? ''
        },
        select: {
          id: true,
          userId: true,
          name: true,
          imageUrl: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });
    }

    const safeProfile: SafeProfile = {
      ...currentProfile,
      createdAt: currentProfile.createdAt.toISOString(),
      updatedAt: currentProfile.updatedAt.toISOString()
    };

    return safeProfile;
  } catch {
    return null;
  }
}
