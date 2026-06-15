import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';

type Params = { params: Promise<{ courseId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { courseId } = await params;

    const publishedChapterCount = await db.chapter.count({
      where: { courseId, isPublished: true }
    });

    const purchases = await db.purchase.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' }
    });

    const buyerUserIds = Array.from(new Set(purchases.map((p) => p.userId)));

    const [profiles, progressRecords] = await Promise.all([
      db.profile.findMany({
        where: { userId: { in: buyerUserIds } },
        select: { userId: true, name: true, email: true, imageUrl: true }
      }),
      db.userProgress.findMany({
        where: {
          userId: { in: buyerUserIds },
          chapter: { courseId, isPublished: true },
          isCompleted: true
        },
        select: { userId: true }
      })
    ]);

    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const completedMap = new Map<string, number>();
    for (const rec of progressRecords) {
      completedMap.set(rec.userId, (completedMap.get(rec.userId) ?? 0) + 1);
    }

    const learners = purchases.map((purchase) => {
      const profile = profileMap.get(purchase.userId);
      const completed = completedMap.get(purchase.userId) ?? 0;
      const progress =
        publishedChapterCount > 0 ? Math.round((completed / publishedChapterCount) * 100) : 0;

      return {
        purchaseId: purchase.id,
        userId: purchase.userId,
        name: profile?.name ?? 'Unknown',
        email: profile?.email ?? '',
        imageUrl: profile?.imageUrl ?? null,
        progress,
        enrolledAt: purchase.createdAt
      };
    });

    return mobileSuccess(learners);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_LEARNERS_LIST', error);
  }
}
