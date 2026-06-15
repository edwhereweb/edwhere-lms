import { auth } from '@clerk/nextjs/server';
import { mobileError, handleMobileApiError, mobileSuccess } from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { hasBatchAccess } from '@/lib/batch-auth';

type Params = { params: Promise<{ batchId: string; moduleId: string; itemId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { batchId, itemId } = await params;

    const hasAccess = await hasBatchAccess(batchId, userId);
    if (!hasAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const session = await db.offlineSession.findUnique({ where: { itemId } });
    if (!session) return mobileError('NOT_FOUND', 'Session not found', 404);

    const mcq = await db.sessionMcq.findUnique({
      where: { sessionId: session.id },
      include: {
        questions: { orderBy: { position: 'asc' } },
        submissions: true
      }
    });

    if (!mcq) {
      return mobileSuccess({ questions: [], students: [], summary: null });
    }

    // Per-question stats: how many got each question correct
    const questionStats = mcq.questions.map((q, qIndex) => {
      let correct = 0;
      let total = 0;

      for (const sub of mcq.submissions) {
        // Map shuffled answer back to original position
        const originalIndex = sub.shuffleMap[qIndex];
        if (originalIndex !== undefined) {
          total++;
          const studentAnswer = sub.answers[qIndex];
          if (studentAnswer === q.correctOption) {
            correct++;
          }
        }
      }

      return {
        questionId: q.id,
        body: q.body,
        position: q.position,
        correctCount: correct,
        totalAttempts: total,
        correctPercentage: total > 0 ? Math.round((correct / total) * 100) : 0
      };
    });

    // Per-student scores
    const studentUserIds = mcq.submissions.map((s) => s.userId);
    const profiles = await db.profile.findMany({
      where: { userId: { in: studentUserIds } },
      select: { userId: true, name: true, email: true }
    });
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const studentScores = mcq.submissions.map((s) => ({
      userId: s.userId,
      name: profileMap.get(s.userId)?.name || 'Unknown',
      email: profileMap.get(s.userId)?.email || 'No Email',
      score: s.score,
      total: s.total,
      percentage: s.total > 0 ? Math.round((s.score / s.total) * 100) : 0,
      submittedAt: s.submittedAt.toISOString()
    }));

    const summary = {
      totalQuestions: mcq.questions.length,
      totalSubmissions: mcq.submissions.length,
      averageScore:
        mcq.submissions.length > 0
          ? Math.round(
              mcq.submissions.reduce((sum, s) => sum + s.score, 0) / mcq.submissions.length
            )
          : 0,
      averageTotal:
        mcq.submissions.length > 0
          ? Math.round(
              mcq.submissions.reduce((sum, s) => sum + s.total, 0) / mcq.submissions.length
            )
          : 0
    };

    return mobileSuccess({
      questions: questionStats,
      students: studentScores,
      summary
    });
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_MCQ_ANALYTICS', error);
  }
}
