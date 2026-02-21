import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import getSafeProfile from '@/actions/get-safe-profile';

interface Params {
  params: { courseId: string };
}

// POST /api/courses/[courseId]/messages/read-student
export async function POST(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await getSafeProfile();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // Students only mark their own thread as read
    await db.studentLastRead.upsert({
      where: {
        studentId_courseId: {
          studentId: profile.id,
          courseId: params.courseId
        }
      },
      update: { lastReadAt: new Date() },
      create: {
        studentId: profile.id,
        courseId: params.courseId,
        lastReadAt: new Date()
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[MESSAGES_READ_STUDENT_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
