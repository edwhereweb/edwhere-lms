import { auth } from '@clerk/nextjs/server';
import { mobileError, handleMobileApiError, mobileSuccess } from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { hasBatchAccess } from '@/lib/batch-auth';

type Params = { params: Promise<{ batchId: string; itemId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { batchId, itemId } = await params;

    const hasAccess = await hasBatchAccess(batchId, userId);
    if (!hasAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const item = await db.batchItem.findUnique({
      where: { id: itemId },
      include: { task: true }
    });
    if (!item?.task) return mobileError('NOT_FOUND', 'Task not found for this item', 404);

    const submissions = await db.batchTaskSubmission.findMany({
      where: { taskId: item.task.id },
      orderBy: { createdAt: 'desc' }
    });

    const userIds = submissions.map((s) => s.userId);
    const profiles = await db.profile.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, name: true, email: true }
    });
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const enriched = submissions.map((s) => ({
      ...s,
      name: profileMap.get(s.userId)?.name || 'Unknown',
      email: profileMap.get(s.userId)?.email || 'No Email'
    }));

    return mobileSuccess(enriched);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_TASK_SUBMISSIONS_GET', error);
  }
}
