import { auth } from '@clerk/nextjs/server';
import {
  mobileSuccess,
  mobileCreated,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { checkCourseEdit } from '@/lib/course-auth';
import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';
import { messageBodySchema } from '@/lib/validations';

type Params = { params: Promise<{ courseId: string }> };

export async function GET(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { courseId } = await params;
    const denied = await checkCourseEdit(userId, courseId);
    if (denied) return denied;

    const { searchParams } = new URL(req.url);
    const take = Math.min(parseInt(searchParams.get('take') || '50'), 100);
    const cursor = searchParams.get('cursor') || undefined;

    const messages = await db.courseMessage.findMany({
      where: { courseId },
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, imageUrl: true } }
      }
    });

    return mobileSuccess(messages);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_MENTOR_MESSAGES_LIST', error);
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { courseId } = await params;
    const denied = await checkCourseEdit(userId, courseId);
    if (denied) return denied;

    const body = await req.json();
    const result = validateMobileBody(messageBodySchema, body);
    if (!result.success) return result.response;

    const profile = await currentProfile();
    if (!profile) return mobileError('NOT_FOUND', 'Profile not found', 404);

    if (!result.data.threadStudentId) {
      return mobileError('VALIDATION', 'threadStudentId is required', 400);
    }

    const message = await db.courseMessage.create({
      data: {
        content: result.data.content,
        courseId,
        authorId: profile.id,
        threadStudentId: result.data.threadStudentId
      },
      include: {
        author: { select: { id: true, name: true, imageUrl: true } }
      }
    });

    return mobileCreated(message);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_MENTOR_MESSAGE_CREATE', error);
  }
}
