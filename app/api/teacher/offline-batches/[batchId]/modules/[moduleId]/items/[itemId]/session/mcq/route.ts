import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { createMcqSchema, createMcqQuestionSchema } from '@/lib/validations';
import { canManageBatch } from '@/lib/batch-auth';
import { db } from '@/lib/db';

type Params = { params: Promise<{ itemId: string }> };

// GET: Instructor view — includes correct answers and all submissions
export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return apiError('Forbidden', 403);

    const { itemId } = await params;
    const mcq = await db.sessionMcq.findFirst({
      where: { session: { itemId } },
      include: {
        questions: { orderBy: { position: 'asc' } },
        submissions: { orderBy: { submittedAt: 'desc' } }
      }
    });

    if (!mcq) return apiError('MCQ not found', 404);
    return NextResponse.json(mcq);
  } catch (error) {
    return handleApiError('GET_SESSION_MCQ', error);
  }
}

// POST: Create MCQ with initial questions
export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return apiError('Forbidden', 403);

    const { itemId } = await params;
    const session = await db.offlineSession.findUnique({ where: { itemId } });
    if (!session) return apiError('Session not found', 404);

    const existing = await db.sessionMcq.findUnique({ where: { sessionId: session.id } });
    if (existing) return apiError('MCQ already exists for this session', 409);

    const body = await req.json();
    const validation = validateBody(createMcqSchema, body);
    if (!validation.success) return validation.response;

    const mcq = await db.sessionMcq.create({
      data: {
        sessionId: session.id,
        title: validation.data.title ?? 'Session MCQ'
      }
    });

    return NextResponse.json(mcq, { status: 201 });
  } catch (error) {
    return handleApiError('CREATE_SESSION_MCQ', error);
  }
}

// PATCH: Add a question to the MCQ
export async function PATCH(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return apiError('Forbidden', 403);

    const { itemId } = await params;
    const mcq = await db.sessionMcq.findFirst({ where: { session: { itemId } } });
    if (!mcq) return apiError('MCQ not found', 404);

    const body = await req.json();
    const validation = validateBody(createMcqQuestionSchema, body);
    if (!validation.success) return validation.response;

    const last = await db.sessionMcqQuestion.findFirst({
      where: { mcqId: mcq.id },
      orderBy: { position: 'desc' },
      select: { position: true }
    });

    const question = await db.sessionMcqQuestion.create({
      data: {
        mcqId: mcq.id,
        body: validation.data.body,
        options: validation.data.options,
        correctOption: validation.data.correctOption,
        position: (last?.position ?? -1) + 1
      }
    });

    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    return handleApiError('ADD_MCQ_QUESTION', error);
  }
}

// DELETE: Remove a question (pass { questionId } in body)
export async function DELETE(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return apiError('Forbidden', 403);

    const { itemId } = await params;
    const mcq = await db.sessionMcq.findFirst({ where: { session: { itemId } } });
    if (!mcq) return apiError('MCQ not found', 404);

    const body = await req.json();
    const questionId = body?.questionId as string | undefined;
    if (!questionId) return apiError('questionId is required', 400);

    const question = await db.sessionMcqQuestion.findFirst({
      where: { id: questionId, mcqId: mcq.id }
    });
    if (!question) return apiError('Question not found', 404);

    await db.sessionMcqQuestion.delete({ where: { id: questionId } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return handleApiError('DELETE_MCQ_QUESTION', error);
  }
}
