import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { apiError, handleApiError } from '@/lib/api-utils';
import { canManageBatch } from '@/lib/batch-auth';
import { db } from '@/lib/db';

type Params = { params: Promise<{ batchId: string; itemId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return apiError('Forbidden', 403);

    const { batchId, itemId } = await params;

    // Fetch MCQ with questions and all submissions
    const mcq = await db.sessionMcq.findFirst({
      where: { session: { itemId } },
      include: {
        questions: { orderBy: { position: 'asc' } },
        submissions: true
      }
    });
    if (!mcq) return apiError('MCQ not found', 404);

    // Total enrolled in the batch
    const enrollments = await db.batchEnrollment.findMany({
      where: { batchId },
      select: { userId: true }
    });
    const totalEnrolled = enrollments.length;

    // Fetch attendance to determine who was locked out (ABSENT students cannot take MCQ)
    const session = await db.offlineSession.findFirst({
      where: { itemId },
      select: { id: true, attendanceSubmittedAt: true }
    });

    const attendances = session
      ? await db.sessionAttendance.findMany({
          where: { sessionId: session.id },
          select: { userId: true, status: true }
        })
      : [];

    const absentCount = attendances.filter((a) => a.status === 'ABSENT').length;
    // Students who were eligible (Present or Late) could access the MCQ
    const eligibleCount = totalEnrolled - absentCount;
    const participantCount = mcq.submissions.length;

    // Participation rate is relative to eligible students (those who could access the MCQ)
    const participationRate =
      eligibleCount > 0 ? Math.round((participantCount / eligibleCount) * 100) : 0;

    // Class average score as a percentage
    const classAverageScore =
      participantCount > 0
        ? Math.round(
            (mcq.submissions.reduce((sum, s) => {
              return sum + (s.total > 0 ? s.score / s.total : 0);
            }, 0) /
              participantCount) *
              1000
          ) / 10 // one decimal place
        : 0;

    // Per-question correctness — resolve shuffleMap to get the original option each student chose
    const questionStats = mcq.questions.map((q) => {
      let correctCount = 0;
      let incorrectCount = 0;

      for (const submission of mcq.submissions) {
        // shuffleMap[displayIdx] = originalIdx
        // answers[displayIdx] = chosen option index in shuffled display order
        // We need: originalChosenOption = shuffleMap[answers[displayIdx]]
        // But the display position maps to question position — we need to find
        // the display index that corresponds to this question's original position.
        const originalPosition = q.position;

        // shuffleMap is an array where shuffleMap[displayIdx] = originalIdx
        // Find the displayIdx for this question
        const displayIdx = submission.shuffleMap.indexOf(originalPosition);

        if (displayIdx === -1) {
          // Question wasn't in this submission (shouldn't happen with valid data)
          continue;
        }

        const chosenDisplayOption = submission.answers[displayIdx];
        // The chosen display option maps back to the original option via shuffleMap
        // Wait — the shuffleMap is for question order, not option order.
        // Options are NOT shuffled in SessionMcq (no optionShuffleMap stored).
        // So the chosen answer index is already in original option space.
        const chosenOriginalOption = chosenDisplayOption;

        if (chosenOriginalOption === q.correctOption) {
          correctCount++;
        } else {
          incorrectCount++;
        }
      }

      const total = correctCount + incorrectCount;
      const correctPct = total > 0 ? Math.round((correctCount / total) * 1000) / 10 : 0;

      return {
        id: q.id,
        position: q.position,
        body: q.body,
        options: q.options,
        correctOption: q.correctOption,
        correctCount,
        incorrectCount,
        correctPct
      };
    });

    return NextResponse.json({
      mcqTitle: mcq.title,
      totalEnrolled,
      eligibleCount,
      participantCount,
      participationRate,
      classAverageScore,
      attendanceFinalized: !!session?.attendanceSubmittedAt,
      questions: questionStats
    });
  } catch (error) {
    return handleApiError('GET_MCQ_ANALYTICS', error);
  }
}
