import { db } from '@/lib/db';
import { debug } from '@/lib/debug';

// ── XP Values ──────────────────────────────────────────────────────────────
// These constants define how much XP each action is worth.
export const XP_REWARDS = {
  VIDEO_COMPLETE: 10,
  TEXT_COMPLETE: 15,
  PDF_COMPLETE: 15,
  HTML_EMBED_COMPLETE: 20, // Gamified (CTF) lessons
  CTF_FLAG_CORRECT: 50,
  QUIZ_PASS: 100,
  QUIZ_PERFECT_BONUS: 50,
  PROJECT_APPROVED: 250
} as const;

// ── Level Thresholds ────────────────────────────────────────────────────────
// Level is derived from total XP using a square-root curve.
// Level 1: 0 XP, Level 2: 100 XP, Level 5: 400 XP, Level 10: 900 XP, etc.
export function xpToLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

// Returns XP required to reach the given level.
export function levelToXp(level: number): number {
  return Math.pow(level - 1, 2) * 100;
}

// Returns XP required for the NEXT level (for progress bar calculations).
export function xpForNextLevel(currentXp: number): {
  current: number;
  needed: number;
  level: number;
} {
  const level = xpToLevel(currentXp);
  const currentLevelXp = levelToXp(level);
  const nextLevelXp = levelToXp(level + 1);
  return {
    level,
    current: currentXp - currentLevelXp,
    needed: nextLevelXp - currentLevelXp
  };
}

// ── Level Name Labels ───────────────────────────────────────────────────────
const LEVEL_NAMES: Record<number, string> = {
  1: 'Novice',
  2: 'Learner',
  3: 'Explorer',
  4: 'Apprentice',
  5: 'Practitioner',
  7: 'Specialist',
  10: 'Expert',
  15: 'Master',
  20: 'Elite',
  25: 'Grandmaster'
};

export function getLevelName(level: number): string {
  const thresholds = Object.keys(LEVEL_NAMES)
    .map(Number)
    .sort((a, b) => b - a);
  for (const t of thresholds) {
    if (level >= t) return LEVEL_NAMES[t];
  }
  return 'Novice';
}

// ── Core XP Award Function ──────────────────────────────────────────────────
// Awards XP to a student and updates their level and streak.
// Returns the updated stats including new level (for client-side toast).
export async function awardXp(
  userId: string,
  amount: number
): Promise<{
  totalXp: number;
  currentLevel: number;
  leveledUp: boolean;
  currentStreak: number;
} | null> {
  try {
    const now = new Date();

    const existing = await db.userProgressStats.findUnique({ where: { userId } });

    let newStreak = 1;
    let longestStreak = existing?.longestStreak ?? 0;

    if (existing) {
      const lastActive = existing.lastActiveAt;
      const hoursSinceActive = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);

      if (hoursSinceActive < 24) {
        // Same day or recently active — preserve streak, don't double-count
        newStreak = existing.currentStreak;
      } else if (hoursSinceActive < 48) {
        // Active within 48 hours — streak continues
        newStreak = existing.currentStreak + 1;
      } else {
        // Streak broken
        newStreak = 1;
      }

      longestStreak = Math.max(longestStreak, newStreak);
    }

    const previousLevel = existing?.currentLevel ?? 1;
    const newXp = (existing?.totalXp ?? 0) + amount;
    const newLevel = xpToLevel(newXp);
    const leveledUp = newLevel > previousLevel;

    const updated = await db.userProgressStats.upsert({
      where: { userId },
      create: {
        userId,
        totalXp: amount,
        currentLevel: xpToLevel(amount),
        currentStreak: 1,
        longestStreak: 1,
        lastActiveAt: now
      },
      update: {
        totalXp: newXp,
        currentLevel: newLevel,
        currentStreak: newStreak,
        longestStreak,
        lastActiveAt: now
      }
    });

    debug(
      'GAMIFICATION',
      `Awarded ${amount} XP to ${userId}. Total: ${updated.totalXp}. Level: ${updated.currentLevel}. Streak: ${updated.currentStreak}`
    );

    return {
      totalXp: updated.totalXp,
      currentLevel: updated.currentLevel,
      leveledUp,
      currentStreak: updated.currentStreak
    };
  } catch (error) {
    // XP award failures should never block the main learning action
    debug('GAMIFICATION_ERROR', error);
    return null;
  }
}
