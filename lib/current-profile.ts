import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/debug';
import { cache } from 'react';

export const currentProfile = cache(async () => {
  try {
    const session = await auth();
    const userId = session?.userId;

    if (!userId) {
      return null;
    }

    const profile = await db.profile.findUnique({
      where: {
        userId
      }
    });

    return profile;
  } catch (error) {
    logError('CURRENT_PROFILE', error);
    return null;
  }
});
