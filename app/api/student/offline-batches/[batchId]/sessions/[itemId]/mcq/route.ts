import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { submitMcqSchema } from '@/lib/validations';
import { isStudentEnrolledInBatch } from '@/actions/get-batches';
import { isMcqWindowOpen, scoreAnswers } from '@/lib/session-upload';
import { db } from '@/lib/db';

type Params = { params: Promise<{ batchId: string; itemId: string }> };

// GET: Student gets shuffled MCQ (with their shuffle map) — no correct answers included
export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const { batchId, itemId } = await params;
    const enrolled = await isStudentEnrolledInBatch(batchId, userId);
    if (!enrolled) return apiError('Forbidden', 403);

    const session = await db.offlineSession.findUnique({
      where: { itemId },
      include: {
        attendances: { where: { userId } },
        mcq: {
          include: {
            questions: { orderBy: { position: 'asc' } },
            submissions: { where: { userId } }
          }
        }
      }
    });

    if (!session?.mcq) return apiError('MCQ not found', 404);

    // Absentee penalty
    const attendance = session.attendances[0];
    if (attendance?.status === 'ABSENT') {
      return apiError('You were marked absent and cannot access this assessment.', 403);
    }

    const open = isMcqWindowOpen(session.scheduledAt, session.completedAt ?? null);

    // Strip correct answers from questions
    const questions = session.mcq.questions.map((q) => ({
      id: q.id,
      body: q.body,
      options: q.options,
      position: q.position
    }));

    // Check if already submitted
    const existing = session.mcq.submissions[0];
    if (existing) {
      return NextResponse.json({
        mcqId: session.mcq.id,
        title: session.mcq.title,
        windowOpen: open,
        submitted: true,
        score: existing.score,
        total: existing.total,
        questions
      });
    }

    // Generate deterministic shuffle for this student
    const { generateShuffleMap } = await import('@/lib/session-upload');
    const shuffleMap = generateShuffleMap(session.mcq.id, userId, questions.length);
    const shuffledQuestions = shuffleMap.map((origIdx) => questions[origIdx]);

    return NextResponse.json({
      mcqId: session.mcq.id,
      title: session.mcq.title,
      windowOpen: open,
      submitted: false,
      shuffleMap,
      questions: shuffledQuestions
    });
  } catch (error) {
    return handleApiError('GET_STUDENT_MCQ', error);
  }
}

// POST: Student submits answers
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
        attendances: { where: { userId } },
        mcq: {
          include: {
            questions: { orderBy: { position: 'asc' } },
            submissions: { where: { userId } }
          }
        }
      }
    });

    if (!session?.mcq) return apiError('MCQ not found', 404);

    // Absentee penalty
    const attendance = session.attendances[0];
    if (attendance?.status === 'ABSENT') {
      return apiError('You were marked absent and cannot access this assessment.', 403);
    }

    // Check for existing submission (no re-attempts)
    if (session.mcq.submissions.length > 0) {
      return apiError('You have already submitted this MCQ', 409);
    }

    // Enforce time window
    const open = isMcqWindowOpen(session.scheduledAt, session.completedAt ?? null);
    if (!open) {
      return apiError(
        'The MCQ window is not open. You can only submit during or up to 30 minutes after the session.',
        403
      );
    }

    const body = await req.json();
    const validation = validateBody(submitMcqSchema, body);
    if (!validation.success) return validation.response;

    const { answers, shuffleMap } = validation.data;
    const questions = session.mcq.questions;

    if (answers.length !== questions.length) {
      return apiError(`Expected ${questions.length} answers, got ${answers.length}`, 400);
    }
    if (shuffleMap.length !== questions.length) {
      return apiError('shuffleMap length mismatch', 400);
    }

    // Re-derive the server-side shuffle map and verify it matches what the client sent
    const { generateShuffleMap } = await import('@/lib/session-upload');
    const serverMap = generateShuffleMap(session.mcq.id, userId, questions.length);
    const mapsMatch = serverMap.every((v, i) => v === shuffleMap[i]);
    if (!mapsMatch) return apiError('Invalid shuffle map', 400);

    const score = scoreAnswers(questions, answers, shuffleMap);

    const submission = await db.sessionMcqSubmission.create({
      data: {
        mcqId: session.mcq.id,
        userId,
        answers,
        shuffleMap,
        score,
        total: questions.length
      }
    });

    return NextResponse.json({ score, total: questions.length, submission });
  } catch (error) {
    return handleApiError('SUBMIT_MCQ', error);
  }
}
