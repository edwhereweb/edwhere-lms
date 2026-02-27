import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getObject } from '@/lib/r2';
import { db } from '@/lib/db';
import { handleApiError, apiError } from '@/lib/api-utils';

async function hasAccessToCourse(userId: string, courseId: string): Promise<boolean> {
  const profile = await db.profile.findUnique({ where: { userId } });
  if (!profile) return false;
  if (profile.role === 'ADMIN' || profile.role === 'TEACHER') return true;

  const purchase = await db.purchase.findUnique({
    where: { userId_courseId: { userId, courseId } }
  });
  return !!purchase;
}

async function authorizePrivateAccess(
  userId: string | null | undefined,
  pathSegments: string[]
): Promise<NextResponse | null> {
  if (!userId) return apiError('Unauthorized', 401);

  const category = pathSegments[1]; // e.g. 'attachments' or 'chapter-pdfs'
  const resourceId = pathSegments[2]; // courseId or chapterId

  if (!category || !resourceId) return apiError('Invalid path', 400);

  if (category === 'attachments') {
    const allowed = await hasAccessToCourse(userId, resourceId);
    if (!allowed) return apiError('Forbidden', 403);
    return null;
  }

  if (category === 'chapter-pdfs') {
    const chapter = await db.chapter.findUnique({
      where: { id: resourceId },
      select: { courseId: true }
    });
    if (!chapter) return apiError('Not found', 404);

    const allowed = await hasAccessToCourse(userId, chapter.courseId);
    if (!allowed) return apiError('Forbidden', 403);
    return null;
  }

  return apiError('Invalid path', 400);
}

export async function GET(_req: Request, { params }: { params: { path: string[] } }) {
  try {
    const { path: pathSegments } = params;
    if (!pathSegments || pathSegments.length < 2) {
      return apiError('Invalid file path', 400);
    }

    const key = pathSegments.join('/');
    const visibility = pathSegments[0]; // 'public' or 'private'

    if (visibility === 'private') {
      const { userId } = await auth();
      const denied = await authorizePrivateAccess(userId, pathSegments);
      if (denied) return denied;
    } else if (visibility !== 'public') {
      return apiError('Invalid file path', 400);
    }

    const object = await getObject(key);
    if (!object) return apiError('Not found', 404);

    const headers: HeadersInit = {};
    if (object.contentType) headers['Content-Type'] = object.contentType;
    if (object.contentLength != null) headers['Content-Length'] = String(object.contentLength);
    headers['Cache-Control'] = 'private, max-age=3600';

    return new NextResponse(object.body, { status: 200, headers });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'NoSuchKey') {
      return apiError('Not found', 404);
    }
    return handleApiError('FILE_SERVE', error);
  }
}
