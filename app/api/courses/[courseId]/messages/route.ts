import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { currentProfile } from '@/lib/current-profile';
import { apiError, validateBody, handleApiError } from '@/lib/api-utils';
import { messageBodySchema } from '@/lib/validations';

interface Params {
  params: { courseId: string };
}

async function canAccessChat(userId: string, courseId: string) {
  const profile = await currentProfile();
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
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await currentProfile();
    if (!profile) return apiError('Unauthorized', 401);

    const allowed = await canAccessChat(userId, params.courseId);
    if (!allowed) return apiError('Forbidden', 403);

    const url = new URL(req.url);
    const threadStudentId = url.searchParams.get('threadStudentId');

    const isInstructor = profile.role === 'ADMIN' || profile.role === 'TEACHER';
    const resolvedThreadId = isInstructor ? (threadStudentId ?? undefined) : profile.id;

    if (!resolvedThreadId) {
      return apiError('threadStudentId required', 400);
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
    return handleApiError('MESSAGES_GET', error);
  }
}

// POST /api/courses/[courseId]/messages
export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await currentProfile();
    if (!profile) return apiError('Unauthorized', 401);

    const allowed = await canAccessChat(userId, params.courseId);
    if (!allowed) return apiError('Forbidden', 403);

    const body = await req.json();
    const validation = validateBody(messageBodySchema, body);
    if (!validation.success) return validation.response;

    const isInstructor = profile.role === 'ADMIN' || profile.role === 'TEACHER';
    const threadStudentId = isInstructor ? validation.data.threadStudentId : profile.id;

    if (!threadStudentId) {
      return apiError('threadStudentId required for instructors', 400);
    }

    const message = await db.courseMessage.create({
      data: {
        content: validation.data.content,
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
    return handleApiError('MESSAGES_POST', error);
  }
}
