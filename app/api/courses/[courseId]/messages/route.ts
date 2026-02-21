import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import getSafeProfile from '@/actions/get-safe-profile';
import { z } from 'zod';

interface Params {
  params: { courseId: string };
}

async function canAccessChat(userId: string, courseId: string) {
  const profile = await getSafeProfile();
  if (!profile) return false;
  if (profile.role === 'ADMIN' || profile.role === 'TEACHER') return true;
  const purchase = await db.purchase.findUnique({
    where: { userId_courseId: { userId, courseId } }
  });
  return !!purchase;
}

// GET /api/courses/[courseId]/messages?threadStudentId=xxx
export async function GET(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await getSafeProfile();
    if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const allowed = await canAccessChat(userId, params.courseId);
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const url = new URL(req.url);
    const threadStudentId = url.searchParams.get('threadStudentId');

    // Students can only see their own thread
    const isInstructor = profile.role === 'ADMIN' || profile.role === 'TEACHER';
    const resolvedThreadId = isInstructor
      ? (threadStudentId ?? undefined) // instructor may request any thread
      : profile.id; // student always sees only their own

    if (!resolvedThreadId) {
      return NextResponse.json({ error: 'threadStudentId required' }, { status: 400 });
    }

    const messages = await db.courseMessage.findMany({
      where: { courseId: params.courseId, threadStudentId: resolvedThreadId },
      include: {
        author: { select: { id: true, name: true, imageUrl: true, role: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('[MESSAGES_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/courses/[courseId]/messages
// Body: { content, threadStudentId? } — threadStudentId required for instructors
const bodySchema = z.object({
  content: z.string().min(1).max(4000),
  threadStudentId: z.string().optional()
});

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await getSafeProfile();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const allowed = await canAccessChat(userId, params.courseId);
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const isInstructor = profile.role === 'ADMIN' || profile.role === 'TEACHER';

    // Instructors must supply which thread they're replying to
    const threadStudentId = isInstructor ? parsed.data.threadStudentId : profile.id; // students always post to their own thread

    if (!threadStudentId) {
      return NextResponse.json(
        { error: 'threadStudentId required for instructors' },
        { status: 400 }
      );
    }

    const message = await db.courseMessage.create({
      data: {
        content: parsed.data.content,
        courseId: params.courseId,
        authorId: profile.id,
        threadStudentId
      },
      include: {
        author: { select: { id: true, name: true, imageUrl: true, role: true } }
      }
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('[MESSAGES_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
