import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { studentSessionFeedbackSchema } from '@/lib/validations';
import { isStudentEnrolledInBatch } from '@/actions/get-batches';
import { db } from '@/lib/db';

type Params = { params: Promise<{ batchId: string; itemId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const { batchId, itemId } = await params;
    const enrolled = await isStudentEnrolledInBatch(batchId, userId);
    if (!enrolled) return apiError('Forbidden', 403);

    const session = await db.offlineSession.findUnique({
      where: { itemId },
      include: {
        mcq: {
          include: {
            submissions: { where: { userId } }
          }
        }
      }
    });

    if (!session) return apiError('Session not found', 404);

    // Check if MCQ is already submitted (feedback is mandatory after MCQ submission)
    // Actually, the requirement is "before they can view results".
    // So we can allow feedback submission anytime after the session starts/completes.
    if (!session.completedAt) {
      return apiError('Feedback can only be submitted after the session is completed', 400);
    }

    // Check for existing feedback
    const existingFeedback = await db.studentSessionFeedback.findUnique({
      where: {
        sessionId_userId: {
          sessionId: session.id,
          userId
        }
      }
    });

    if (existingFeedback) {
      return apiError('You have already submitted feedback for this session', 409);
    }

    const body = await req.json();
    const validation = validateBody(studentSessionFeedbackSchema, body);
    if (!validation.success) return validation.response;

    const feedback = await db.studentSessionFeedback.create({
      data: {
        sessionId: session.id,
        userId,
        ...validation.data
      }
    });

    return NextResponse.json(feedback);
  } catch (error) {
    return handleApiError('SUBMIT_STUDENT_FEEDBACK', error);
  }
}
