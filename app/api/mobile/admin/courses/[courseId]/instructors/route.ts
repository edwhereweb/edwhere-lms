import { auth } from '@clerk/nextjs/server';
import {
  mobileSuccess,
  mobileCreated,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { instructorSchema } from '@/lib/validations';

type Params = { params: Promise<{ courseId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { courseId } = await params;

    const instructors = await db.courseInstructor.findMany({
      where: { courseId },
      include: {
        profile: {
          select: { id: true, name: true, email: true, imageUrl: true }
        }
      }
    });

    return mobileSuccess(instructors);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_INSTRUCTORS_LIST', error);
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
    const result = validateMobileBody(instructorSchema, body);
    if (!result.success) return result.response;

    const instructor = await db.courseInstructor.create({
      data: {
        courseId,
        profileId: result.data.profileId
      },
      include: {
        profile: {
          select: { id: true, name: true, email: true, imageUrl: true }
        }
      }
    });

    return mobileCreated(instructor);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_INSTRUCTOR_ADD', error);
  }
}
