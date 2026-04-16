import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, handleApiError } from '@/lib/api-utils';

import { checkCourseEdit } from '@/lib/course-auth';

export async function GET(
  req: Request,
  { params }: { params: { courseId: string; chapterId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    // Verify course edit authorization (supports owners & assigned instructors)
    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quiz = await (db as any).quiz.findUnique({
      where: { chapterId: params.chapterId },
      include: {
        questions: {
          include: {
            responses: true
          }
        },
        attempts: {
          where: { isCompleted: true },
          take: 500,
          orderBy: { submittedAt: 'desc' },
          include: {
            responses: true
          }
        }
      }
    });

    if (!quiz) return apiError('Quiz not found', 404);

    const attempts = quiz.attempts || [];
    const totalAttempts = attempts.length;

    if (totalAttempts === 0) {
      return NextResponse.json({
        averageScore: 0,
        medianScore: 0,
        gradeDistribution: [],
        questionAnalysis: []
      });
    }

    // 1. Averages and Medians
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scores = attempts.map((a: any) => a.score || 0).sort((a: number, b: number) => a - b);
    const averageScore =
      scores.reduce((sum: number, score: number) => sum + score, 0) / totalAttempts;

    let medianScore = 0;
    const mid = Math.floor(scores.length / 2);
    if (scores.length % 2 === 0) {
      medianScore = (scores[mid - 1] + scores[mid]) / 2;
    } else {
      medianScore = scores[mid];
    }

    // 2. Grade Distribution Histogram Builder
    const distributionBuckets = [
      { range: '0-10', min: 0, max: 10, count: 0 },
      { range: '11-20', min: 11, max: 20, count: 0 },
      { range: '21-30', min: 21, max: 30, count: 0 },
      { range: '31-40', min: 31, max: 40, count: 0 },
      { range: '41-50', min: 41, max: 50, count: 0 },
      { range: '51-60', min: 51, max: 60, count: 0 },
      { range: '61-70', min: 61, max: 70, count: 0 },
      { range: '71-80', min: 71, max: 80, count: 0 },
      { range: '81-90', min: 81, max: 90, count: 0 },
      { range: '91-100', min: 91, max: 100, count: 0 }
    ];

    scores.forEach((score: number) => {
      for (const bucket of distributionBuckets) {
        if (score >= bucket.min && score <= bucket.max) {
          bucket.count++;
          break;
        }
      }
    });

    // 3. Question-Level Analysis (Success Rates & Distractors)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const questionAnalysis = quiz.questions.map((question: any) => {
      let correctCount = 0;
      let incorrectCount = 0;
      const optionFrequency: Record<number, number> = {};

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const relevantResponses = question.responses.filter((r: any) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        attempts.some((a: any) => a.id === r.attemptId)
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      relevantResponses.forEach((response: any) => {
        const selected = response.selectedOptions || [];
        const isCorrect =
          selected.length === question.correctOptions.length &&
          selected.every((val: number) => question.correctOptions.includes(val));

        if (isCorrect) correctCount++;
        else incorrectCount++;

        selected.forEach((optIndex: number) => {
          if (!optionFrequency[optIndex]) optionFrequency[optIndex] = 0;
          optionFrequency[optIndex]++;
        });
      });

      const totalResponsesForQ = correctCount + incorrectCount;
      const successRate =
        totalResponsesForQ === 0 ? 0 : Math.round((correctCount / totalResponsesForQ) * 100);

      // Map Distractors (Incorrect options chosen frequently)
      const distractors = question.options
        .map((optText: string, idx: number) => {
          if (question.correctOptions.includes(idx)) return null; // Not a distractor if it is the correct answer
          return {
            optionIndex: idx,
            text: optText,
            count: optionFrequency[idx] || 0
          };
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((d: any) => d !== null)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .sort((a: any, b: any) => b.count - a.count);

      return {
        id: question.id,
        body: question.body,
        successRate,
        totalAttempts: totalResponsesForQ,
        needsReview: successRate < 50, // Flag if failure rate > 50%
        distractors
      };
    });

    return NextResponse.json({
      averageScore: Math.round(averageScore * 10) / 10,
      medianScore: Math.round(medianScore * 10) / 10,
      totalAttempts,
      gradeDistribution: distributionBuckets.map((b) => ({ range: b.range, count: b.count })),
      questionAnalysis
    });
  } catch (error) {
    return handleApiError('QUIZ_ANALYTICS_GET', error);
  }
}
