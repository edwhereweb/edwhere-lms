import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { apiError, handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { xpForNextLevel, getLevelName } from '@/lib/gamification';

// GET /api/gamification/me — returns the current student's XP, level, streak, and badges
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const stats = await db.userProgressStats.findUnique({
      where: { userId }
    });

    if (!stats) {
      return NextResponse.json({
        totalXp: 0,
        currentLevel: 1,
        levelName: 'Novice',
        currentStreak: 0,
        longestStreak: 0,
        xpProgress: { current: 0, needed: 100, level: 1 }
      });
    }

    const xpProgress = xpForNextLevel(stats.totalXp);

    return NextResponse.json({
      totalXp: stats.totalXp,
      currentLevel: stats.currentLevel,
      levelName: getLevelName(stats.currentLevel),
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      xpProgress
    });
  } catch (error) {
    return handleApiError('GET_GAMIFICATION_ME', error);
  }
}
