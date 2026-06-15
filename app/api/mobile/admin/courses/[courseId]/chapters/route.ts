import { auth } from '@clerk/nextjs/server';
import {
  mobileCreated,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { createChapterSchema } from '@/lib/validations';

type Params = { params: Promise<{ courseId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { courseId } = await params;
    const denied = await checkCourseEdit(userId, courseId);
    if (denied) return denied;

    const body = await req.json();
    const result = validateMobileBody(createChapterSchema, body);
    if (!result.success) return result.response;

    const lastChapter = await db.chapter.findFirst({
      where: { courseId },
      orderBy: { position: 'desc' },
      select: { position: true }
    });

    const chapter = await db.chapter.create({
      data: {
        title: result.data.title,
        courseId,
        moduleId: result.data.moduleId ?? undefined,
        contentType: result.data.contentType ?? 'VIDEO_MUX',
        position: (lastChapter?.position ?? -1) + 1
      }
    });

    return mobileCreated(chapter);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_CHAPTER_CREATE', error);
  }
}
