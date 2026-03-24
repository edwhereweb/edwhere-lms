import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, handleApiError } from '@/lib/api-utils';

import { checkCourseEdit } from '@/lib/course-auth';

export async function GET(
  req: Request,
  { params }: { params: { courseId: string; studentId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    // Verify course edit authorization (supports owners & assigned instructors)
    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    // 1. Fetch Course Chapters for Timeline Tracker
    const course = await db.course.findUnique({
      where: { id: params.courseId },
      include: {
        chapters: {
           where: { isPublished: true },
           orderBy: { position: 'asc' },
           include: {
              userProgress: {
                 where: { userId: params.studentId }
              }
           }
        },
        modules: {
           include: {
              chapters: {
                 where: { isPublished: true },
                 orderBy: { position: 'asc' },
                 include: {
                    userProgress: {
                       where: { userId: params.studentId }
                    }
                 }
              }
           }
        }
      }
    });

    if (!course) return apiError('Course not found', 404);

    let allChapters = course.chapters;
    course.modules.forEach(m => {
       allChapters = [...allChapters, ...m.chapters];
    });

    const timeline = allChapters.map(ch => {
       const progress = ch.userProgress[0];
       return {
          id: ch.id,
          title: ch.title,
          isCompleted: !!progress?.isCompleted,
          completedAt: progress?.updatedAt || null,
          contentType: ch.contentType || 'VIDEO'
       };
    });

    // 2. Fetch Quiz Attempts for this specific user
    // First figure out all valid quiz IDs in this course
    const validChapterIds = allChapters.map(c => c.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const courseQuizzes = await (db as any).quiz.findMany({
       where: { chapterId: { in: validChapterIds } }
    });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quizIds = courseQuizzes.map((q: any) => q.id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const studentAttempts = await (db as any).quizAttempt.findMany({
       where: { userId: params.studentId, quizId: { in: quizIds }, isCompleted: true },
       orderBy: { submittedAt: 'desc' },
       include: {
          quiz: {
             include: { chapter: { select: { title: true } } }
          }
       }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quizPerformanceHistory = studentAttempts.map((a: any) => ({
       id: a.id,
       chapterTitle: a.quiz.chapter.title,
       score: a.score,
       submittedAt: a.submittedAt,
       tabSwitches: a.tabSwitches
    }));

    // 3. Peer Benchmarking Comparison Engine
    // Fetch all completed attempts for the whole course to get average
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allCourseAttempts = await (db as any).quizAttempt.findMany({
       where: { quizId: { in: quizIds }, isCompleted: true }
    });

    let courseAverage = 0;
    if (allCourseAttempts.length > 0) {
       // eslint-disable-next-line @typescript-eslint/no-explicit-any
       const total = allCourseAttempts.reduce((acc: number, cur: any) => acc + (cur.score || 0), 0);
       courseAverage = total / allCourseAttempts.length;
    }

    let studentAverage = 0;
    if (studentAttempts.length > 0) {
       // eslint-disable-next-line @typescript-eslint/no-explicit-any
       const stTotal = studentAttempts.reduce((acc: number, cur: any) => acc + (cur.score || 0), 0);
       studentAverage = stTotal / studentAttempts.length;
    }

    return NextResponse.json({
       timeline,
       quizPerformanceHistory,
       benchmarking: {
          studentAverage: Math.round(studentAverage * 10) / 10,
          courseAverage: Math.round(courseAverage * 10) / 10
       }
    });

  } catch (error) {
    return handleApiError('LEARNER_ANALYTICS_GET', error);
  }
}
