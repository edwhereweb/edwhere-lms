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
import { createMcqQuestionSchema } from '@/lib/validations';

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
        questions: { orderBy: { position: 'asc' } }
      }
    });

    if (!mcq) return mobileSuccess({ questions: [] });

    return mobileSuccess(mcq);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_MCQ_GET', error);
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

    const body = await req.json();
    const result = validateMobileBody(createMcqQuestionSchema, body);
    if (!result.success) return result.response;

    // Find or create SessionMcq
    let mcq = await db.sessionMcq.findUnique({ where: { sessionId: session.id } });
    if (!mcq) {
      mcq = await db.sessionMcq.create({
        data: {
          sessionId: session.id,
          title: 'Session MCQ'
        }
      });
    }

    // Auto-set position
    const lastQuestion = await db.sessionMcqQuestion.findFirst({
      where: { mcqId: mcq.id },
      orderBy: { position: 'desc' }
    });
    const position = lastQuestion ? lastQuestion.position + 1 : 0;

    const question = await db.sessionMcqQuestion.create({
      data: {
        mcqId: mcq.id,
        body: result.data.body,
        options: result.data.options,
        correctOption: result.data.correctOption,
        position
      }
    });

    return mobileCreated(question);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_MCQ_QUESTION_CREATE', error);
  }
}
