import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { submitFeedbackSchema } from '@/lib/validations';
import { canManageBatch } from '@/lib/batch-auth';
import { db } from '@/lib/db';

type Params = { params: Promise<{ itemId: string }> };

export async function GET(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return apiError('Forbidden', 403);

    const { itemId } = await params;
    const session = await db.offlineSession.findUnique({
      where: { itemId },
      include: { feedback: true }
    });

    if (!session) return apiError('Session not found', 404);

    return NextResponse.json(session.feedback);
  } catch (error) {
    return handleApiError('GET_SESSION_FEEDBACK', error);
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return apiError('Forbidden', 403);

    const { itemId } = await params;
    const session = await db.offlineSession.findUnique({
      where: { itemId },
      include: { feedback: true }
    });

    if (!session) return apiError('Session not found', 404);
    if (!session.completedAt)
      return apiError('Cannot submit feedback for an incomplete session', 400);
    if (session.feedback)
      return apiError('Feedback has already been submitted for this session', 409);

    const body = await req.json();
    const validation = validateBody(submitFeedbackSchema, body);
    if (!validation.success) return validation.response;

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
    } = validation.data;

    const totalScore =
      askingQuestions +
      answeringQuickly +
      groupTalk +
      classPace +
      understandingIdeas +
      doingTheWork +
      fixingMistakes +
      memory +
      goalCompletion;

    const ieScore = Math.round((totalScore / 9) * 10 * 10) / 10;

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
        ieScore,
        submittedBy: userId
      }
    });

    return NextResponse.json(feedback, { status: 201 });
  } catch (error) {
    return handleApiError('CREATE_SESSION_FEEDBACK', error);
  }
}
