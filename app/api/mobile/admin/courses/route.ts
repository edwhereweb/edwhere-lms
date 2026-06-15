import { auth } from '@clerk/nextjs/server';
import {
  mobileSuccess,
  mobileCreated,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { isTeacher } from '@/lib/teacher';
import { currentProfile } from '@/lib/current-profile';
import { createCourseSchema } from '@/lib/validations';
import { listCourses, createCourse } from '@/lib/services/course-service';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const teacherAccess = await isTeacher();
    if (!teacherAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const profile = await currentProfile();
    const role = profile?.role ?? '';

    const courses = await listCourses(userId, role);

    return mobileSuccess(courses);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_COURSES_LIST', error);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const teacherAccess = await isTeacher();
    if (!teacherAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const body = await req.json();
    const result = validateMobileBody(createCourseSchema, body);
    if (!result.success) return result.response;

    const course = await createCourse(userId, result.data);

    return mobileCreated(course);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_COURSES_CREATE', error);
  }
}
