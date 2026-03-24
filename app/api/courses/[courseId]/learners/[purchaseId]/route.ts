import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { apiError, handleApiError, validateBody } from '@/lib/api-utils';
import { checkCourseEdit } from '@/lib/course-auth';
import { db } from '@/lib/db';
import { unenrollLearnerSchema } from '@/lib/validations';

export async function DELETE(
  req: Request,
  { params }: { params: { courseId: string; purchaseId: string } }
) {
  try {
    const { userId } = await auth();

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    const rawBody = await req.text();
    let parsedBody: unknown = {};
    if (rawBody) {
      try {
        parsedBody = JSON.parse(rawBody);
      } catch {
        return apiError('Invalid request body', 400);
      }
    }

    const validation = validateBody(unenrollLearnerSchema, parsedBody);
    if (!validation.success) return validation.response;

    const purchase = await db.purchase.findFirst({
      where: {
        id: params.purchaseId,
        courseId: params.courseId
      }
    });

    if (!purchase) {
      return apiError('Not Found', 404);
    }

    const force = validation.data.force ?? false;
    const sourceValue = (purchase as { onboardingSource?: string }).onboardingSource;
    const needsDoubleConfirmation = sourceValue !== 'MANUAL';
    if (needsDoubleConfirmation && !force) {
      return apiError('This learner requires final confirmation before unenrollment', 400);
    }

    // Wipe all progress and submission data for this course
    const studentUserId = purchase.userId;

    // 1. Delete UserProgress
    await db.userProgress.deleteMany({
      where: {
        userId: studentUserId,
        chapter: {
          courseId: params.courseId
        }
      }
    });

    // 2. Delete QuizAttempts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).quizAttempt.deleteMany({
      where: {
        userId: studentUserId,
        quiz: {
          chapter: {
            courseId: params.courseId
          }
        }
      }
    });

    // 3. Delete ProjectSubmissions
    await db.projectSubmission.deleteMany({
      where: {
        userId: studentUserId,
        chapter: {
          courseId: params.courseId
        }
      }
    });

    const deletedPurchase = await db.purchase.delete({
      where: { id: params.purchaseId }
    });

    return NextResponse.json(deletedPurchase);
  } catch (error) {
    return handleApiError('COURSE_LEARNER_DELETE', error);
  }
}
