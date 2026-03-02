import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, handleApiError, validateBody } from '@/lib/api-utils';
import { projectSubmissionSchema } from '@/lib/validations';

interface Params {
  params: { courseId: string; chapterId: string };
}

// GET — return the current user's own submission (or null)
export async function GET(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const submission = await db.projectSubmission.findUnique({
      where: { userId_chapterId: { userId, chapterId: params.chapterId } }
    });

    return NextResponse.json(submission ?? null);
  } catch (error) {
    return handleApiError('PROJECT_SUBMISSION_GET', error);
  }
}

// POST — upsert submission; requires course enrollment
export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    // Verify the chapter belongs to the course
    const chapter = await db.chapter.findUnique({
      where: { id: params.chapterId, courseId: params.courseId }
    });
    if (!chapter) return apiError('Not Found', 404);

    // Must be enrolled (or chapter must be free)
    if (!chapter.isFree) {
      const purchase = await db.purchase.findUnique({
        where: { userId_courseId: { userId, courseId: params.courseId } }
      });
      if (!purchase) return apiError('Forbidden — not enrolled', 403);
    }

    const body = await req.json();
    const validation = validateBody(projectSubmissionSchema, body);
    if (!validation.success) return validation.response;

    // Upsert — resets review status to PENDING on resubmission
    const submission = await db.projectSubmission.upsert({
      where: { userId_chapterId: { userId, chapterId: params.chapterId } },
      create: { userId, chapterId: params.chapterId, driveUrl: validation.data.driveUrl },
      update: {
        driveUrl: validation.data.driveUrl,
        status: 'PENDING',
        reviewNote: null,
        reviewedAt: null,
        reviewedBy: null
      }
    });

    // Auto-mark chapter as completed on first submission
    await db.userProgress.upsert({
      where: { userId_chapterId: { userId, chapterId: params.chapterId } },
      create: { userId, chapterId: params.chapterId, isCompleted: true },
      update: { isCompleted: true }
    });

    return NextResponse.json(submission);
  } catch (error) {
    return handleApiError('PROJECT_SUBMISSION_POST', error);
  }
}
