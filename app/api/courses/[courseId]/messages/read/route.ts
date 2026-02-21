import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import getSafeProfile from '@/actions/get-safe-profile';
import { isTeacher } from '@/lib/teacher';
import { z } from 'zod';

interface Params {
  params: { courseId: string };
}

const bodySchema = z.object({ studentId: z.string().min(1) });

// POST /api/courses/[courseId]/messages/read
// Body: { studentId } — whose thread the instructor just read
export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const authorized = await isTeacher();
    if (!authorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const profile = await getSafeProfile();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

    await db.mentorLastRead.upsert({
      where: {
        instructorId_courseId_studentId: {
          instructorId: profile.id,
          courseId: params.courseId,
          studentId: parsed.data.studentId
        }
      },
      update: { lastReadAt: new Date() },
      create: {
        instructorId: profile.id,
        courseId: params.courseId,
        studentId: parsed.data.studentId,
        lastReadAt: new Date()
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[MESSAGES_READ_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
