import { auth } from '@clerk/nextjs/server';
import {
  mobileError,
  validateMobileBody,
  handleMobileApiError,
  mobileSuccess,
  mobileCreated
} from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { hasBatchAccess } from '@/lib/batch-auth';
import { submitFeedbackSchema } from '@/lib/validations';

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

    const [instructorFeedback, studentFeedback] = await Promise.all([
      db.sessionFeedback.findUnique({ where: { sessionId: session.id } }),
      db.studentSessionFeedback.findMany({
        where: { sessionId: session.id },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // Enrich student feedback with profiles
    const studentUserIds = studentFeedback.map((f) => f.userId);
    const profiles = await db.profile.findMany({
      where: { userId: { in: studentUserIds } },
      select: { userId: true, name: true }
    });
    const profileMap = new Map(profiles.map((p) => [p.userId, p.name]));

    const enrichedStudentFeedback = studentFeedback.map((f) => ({
      ...f,
      name: profileMap.get(f.userId) || 'Unknown'
    }));

    return mobileSuccess({
      instructorFeedback,
      studentFeedback: enrichedStudentFeedback
    });
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_FEEDBACK_GET', error);
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { batchId, itemId } = await params;

    const hasAccess = await hasBatchAccess(batchId, userId);
    if (!hasAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const session = await db.offlineSession.findUnique({ where: { itemId } });
    if (!session) return mobileError('NOT_FOUND', 'Session not found', 404);

    // Check if feedback already exists
    const existing = await db.sessionFeedback.findUnique({ where: { sessionId: session.id } });
    if (existing)
      return mobileError('CONFLICT', 'Feedback already submitted for this session', 409);

    const body = await req.json();
    const result = validateMobileBody(submitFeedbackSchema, body);
    if (!result.success) return result.response;

    const {
      wentWell,
      wentWrong,
      askingQuestions,
      answeringQuickly,
      groupTalk,
      classPace,
      understandingIdeas,
      doingTheWork,
      fixingMistakes,
      memory,
      goalCompletion
    } = result.data;

    // Calculate IE score: average of 9 metrics x 10 (to get 0-100 scale)
    const metrics = [
      askingQuestions,
      answeringQuickly,
      groupTalk,
      classPace,
      understandingIdeas,
      doingTheWork,
      fixingMistakes,
      memory,
      goalCompletion
    ];
    const ieScore = (metrics.reduce((sum, m) => sum + m, 0) / metrics.length) * 10;

    const feedback = await db.sessionFeedback.create({
      data: {
        sessionId: session.id,
        wentWell,
        wentWrong,
        askingQuestions,
        answeringQuickly,
        groupTalk,
        classPace,
        understandingIdeas,
        doingTheWork,
        fixingMistakes,
        memory,
        goalCompletion,
        ieScore: Math.round(ieScore * 100) / 100,
        submittedBy: userId
      }
    });

    return mobileCreated(feedback);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_FEEDBACK_SUBMIT', error);
  }
}
